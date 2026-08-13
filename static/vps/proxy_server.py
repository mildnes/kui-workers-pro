#!/usr/bin/env python3
from __future__ import annotations
import os
import ipaddress
import select, socket, threading, urllib.parse, time, base64, hmac, secrets, struct
from typing import Any

def env_secret(name: str) -> str:
    encoded = os.environ.get(name + "_B64")
    if encoded:
        try: return base64.b64decode(encoded).decode("utf-8")
        except Exception: return ""
    return os.environ.get(name, "")

_PROXY_USER = env_secret("PROXY_USER")
_PROXY_PASS = env_secret("PROXY_PASS")

def set_credentials(user: str, passwd: str) -> None:
    global _PROXY_USER, _PROXY_PASS, PROXY_USER, PROXY_PASS
    _PROXY_USER = user
    _PROXY_PASS = passwd
    PROXY_USER = user.encode()
    PROXY_PASS = passwd.encode()

def set_enabled(enabled: bool) -> None:
    if not enabled: set_credentials("", "")

PROXY_USER = _PROXY_USER.encode()
PROXY_PASS = _PROXY_PASS.encode()

# 全局软开关：由 lite_manager 动态更新，实现秒切
ACTIVE_BIND = "tun_main"
MAX_CONNECTIONS = max(16, int(os.environ.get("PROXY_MAX_CONNECTIONS", "256")))
RELAY_IDLE_TIMEOUT = max(60, int(os.environ.get("PROXY_IDLE_TIMEOUT", "600")))
CONNECTION_SLOTS = threading.BoundedSemaphore(MAX_CONNECTIONS)
listener_ready = threading.Event()

def parse_int(value: Any) -> int:
    try: return int(value)
    except: return 0

def recv_exact(sock: socket.socket, size: int) -> bytes:
    data = b""
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk: raise ConnectionError("Unexpected disconnect.")
        data += chunk
    return data

def parse_addr_port(raw: str):
    if not raw:
        return None
    if raw.startswith('['):
        idx = raw.find(']')
        if idx == -1:
            return None
        host = raw[1:idx]
        port_str = raw[idx + 2:] if len(raw) > idx + 1 and raw[idx + 1] == ':' else ''
        port = parse_int(port_str) or 443
        return host, port
    if ':' in raw:
        host, port_text = raw.rsplit(':', 1)
        return host, parse_int(port_text) or 443
    return raw, 443

def _dns_name(packet: bytes, offset: int) -> tuple[str, int]:
    labels = []
    next_offset = offset
    jumped = False
    seen = set()
    while True:
        if offset >= len(packet): raise OSError("truncated DNS name")
        length = packet[offset]
        if length == 0:
            if not jumped: next_offset = offset + 1
            return ".".join(labels), next_offset
        if length & 0xC0 == 0xC0:
            if offset + 1 >= len(packet): raise OSError("truncated DNS pointer")
            pointer = ((length & 0x3F) << 8) | packet[offset + 1]
            if pointer in seen: raise OSError("recursive DNS pointer")
            seen.add(pointer)
            if not jumped: next_offset = offset + 2
            offset = pointer
            jumped = True
            continue
        if length & 0xC0 or offset + 1 + length > len(packet):
            raise OSError("invalid DNS label")
        labels.append(packet[offset + 1:offset + 1 + length].decode("ascii"))
        offset += 1 + length
        if not jumped: next_offset = offset

def _dns_query(host: str, query_type: int, interface: str) -> list[str]:
    labels = host.rstrip(".").encode("idna").split(b".")
    if not labels or any(not label or len(label) > 63 for label in labels):
        raise OSError("invalid DNS name")
    query_id = secrets.randbelow(65536)
    question = b"".join(bytes((len(label),)) + label for label in labels) + b"\x00" + struct.pack("!HH", query_type, 1)
    request = struct.pack("!HHHHHH", query_id, 0x0100, 1, 0, 0, 0) + question
    dns_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        dns_socket.settimeout(4)
        dns_socket.setsockopt(socket.SOL_SOCKET, 25, interface.encode("utf-8"))
        dns_socket.connect(("1.1.1.1", 53))
        dns_socket.send(request)
        response = dns_socket.recv(4096)
    finally:
        dns_socket.close()
    if len(response) < 12: raise OSError("truncated DNS response")
    response_id, flags, qd_count, answer_count, _, _ = struct.unpack("!HHHHHH", response[:12])
    if response_id != query_id or not flags & 0x8000 or flags & 0x000F:
        raise OSError("invalid DNS response")
    offset = 12
    for _ in range(qd_count):
        _, offset = _dns_name(response, offset)
        offset += 4
        if offset > len(response): raise OSError("truncated DNS question")
    addresses = []
    for _ in range(answer_count):
        _, offset = _dns_name(response, offset)
        if offset + 10 > len(response): raise OSError("truncated DNS answer")
        record_type, record_class, _, data_length = struct.unpack("!HHIH", response[offset:offset + 10])
        offset += 10
        if offset + data_length > len(response): raise OSError("truncated DNS data")
        data = response[offset:offset + data_length]
        offset += data_length
        if record_class == 1 and record_type == 1 and len(data) == 4:
            addresses.append(socket.inet_ntop(socket.AF_INET, data))
        elif record_class == 1 and record_type == 28 and len(data) == 16:
            addresses.append(socket.inet_ntop(socket.AF_INET6, data))
    return addresses

def resolve_on_landing(host: str, port: int, interface: str):
    try:
        parsed = ipaddress.ip_address(host)
        family = socket.AF_INET6 if parsed.version == 6 else socket.AF_INET
        sockaddr = (host, port, 0, 0) if family == socket.AF_INET6 else (host, port)
        return [(family, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", sockaddr)]
    except ValueError:
        pass
    addresses = []
    errors = []
    for query_type in (1, 28):
        try: addresses.extend(_dns_query(host, query_type, interface))
        except OSError as error: errors.append(error)
    if not addresses:
        raise errors[-1] if errors else OSError("landing DNS returned no addresses")
    results = []
    for address in dict.fromkeys(addresses):
        parsed = ipaddress.ip_address(address)
        family = socket.AF_INET6 if parsed.version == 6 else socket.AF_INET
        sockaddr = (address, port, 0, 0) if family == socket.AF_INET6 else (address, port)
        results.append((family, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", sockaddr))
    return results

def create_connection(address: tuple[str, int], timeout: float = 20) -> socket.socket:
    global ACTIVE_BIND
    bind_interface = ACTIVE_BIND
    host, port = address
    err = None
    addrinfos = resolve_on_landing(host, port, bind_interface)
    if not addrinfos:
        raise OSError("getaddrinfo empty")

    def sort_key(res):
        af, socktype, proto, canonname, sa = res
        if bind_interface and af != socket.AF_INET:
            return (1, 0)
        return (0, 0)

    addrinfos.sort(key=sort_key)

    for af, socktype, proto, canonname, sa in addrinfos:
        sock = None
        try:
            sock = socket.socket(af, socktype, proto)
            sock.settimeout(timeout)
            if bind_interface and af in (socket.AF_INET, socket.AF_INET6):
                try:
                    sock.setsockopt(socket.SOL_SOCKET, 25, bind_interface.encode('utf-8'))
                except OSError:
                    continue
            sock.connect(sa)
            sock.settimeout(None)
            return sock
        except OSError as e:
            err = e
            if sock:
                sock.close()
    raise err or OSError("getaddrinfo empty")

def relay(left: socket.socket, right: socket.socket) -> None:
    def pump(source: socket.socket, target: socket.socket) -> None:
        try:
            while True:
                data = source.recv(65536)
                if not data:
                    break
                target.sendall(data)
        except OSError:
            pass
        finally:
            try: target.shutdown(socket.SHUT_WR)
            except OSError: pass

    upload = threading.Thread(target=pump, args=(left, right), daemon=True)
    upload.start()
    pump(right, left)
    upload.join(timeout=5)

def socks5_client(client: socket.socket, first_byte: bytes) -> None:
    if not PROXY_USER or not PROXY_PASS:
        client.sendall(b"\x05\xff")
        return
    upstream = None
    try:
        methods_count = recv_exact(client, 1)[0]
        methods = recv_exact(client, methods_count)
        
        if b"\x02" not in methods:
            client.sendall(b"\x05\xFF")
            return
        client.sendall(b"\x05\x02")
        
        auth_req = recv_exact(client, 2)
        if auth_req[0] != 1: return
        ulen = auth_req[1]
        uname = recv_exact(client, ulen)
        plen = recv_exact(client, 1)[0]
        upass = recv_exact(client, plen)
        
        if not hmac.compare_digest(uname, PROXY_USER) or not hmac.compare_digest(upass, PROXY_PASS):
            client.sendall(b"\x01\x01")
            return
        client.sendall(b"\x01\x00") 

        version, command, _, address_type = recv_exact(client, 4)
        if version != 5:
            return
        if command != 1:
            client.sendall(b"\x05\x07\x00\x01\x00\x00\x00\x00\x00\x00")
            return
        if address_type == 1: host = socket.inet_ntoa(recv_exact(client, 4))
        elif address_type == 3: host = recv_exact(client, recv_exact(client, 1)[0]).decode("ascii")
        elif address_type == 4: host = socket.inet_ntop(socket.AF_INET6, recv_exact(client, 16))
        else: return
        port = int.from_bytes(recv_exact(client, 2), "big")
        
        upstream = create_connection((host, port), timeout=20)
        client.settimeout(None)
        upstream.settimeout(RELAY_IDLE_TIMEOUT); client.settimeout(RELAY_IDLE_TIMEOUT)
        client.sendall(b"\x05\x00\x00\x01\x00\x00\x00\x00\x00\x00")
        relay(client, upstream)
    except: pass
    finally:
        client.close()
        if upstream: upstream.close()

def http_client(client: socket.socket, first_byte: bytes) -> None:
    if not PROXY_USER or not PROXY_PASS:
        client.sendall(b"HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n")
        return
    upstream = None
    try:
        data = first_byte
        while b"\r\n\r\n" not in data and len(data) < 65536:
            chunk = client.recv(4096)
            if not chunk: break
            data += chunk
        head, rest = data.split(b"\r\n\r\n", 1)
        lines = head.decode("iso-8859-1", errors="replace").split("\r\n")
        
        expected_auth = "Basic " + base64.b64encode(PROXY_USER + b":" + PROXY_PASS).decode("ascii")
        auth_passed = False
        for line in lines[1:]:
            if line.lower().startswith("proxy-authorization:"):
                if hmac.compare_digest(line.split(":", 1)[1].strip(), expected_auth):
                    auth_passed = True
                    break
                    
        if not auth_passed:
            client.sendall(b"HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm=\"Proxy\"\r\n\r\n")
            return

        method, target, version = lines[0].split(" ", 2)
        if method.upper() == "CONNECT":
            parsed = parse_addr_port(target)
            if not parsed:
                return
            host, port = parsed
            upstream = create_connection((host, port), timeout=20)
            client.settimeout(None)
            upstream.settimeout(RELAY_IDLE_TIMEOUT); client.settimeout(RELAY_IDLE_TIMEOUT)
            client.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
            if rest: upstream.sendall(rest)
            relay(client, upstream)
            return
        parsed = urllib.parse.urlsplit(target)
        if not parsed.hostname: return
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        path = urllib.parse.urlunsplit(("", "", parsed.path or "/", parsed.query, ""))
        headers = [line for line in lines[1:] if not line.lower().startswith(("proxy-connection:", "connection:", "proxy-authorization:"))]
        request = f"{method} {path} {version}\r\n" + "\r\n".join(headers) + "\r\nConnection: close\r\n\r\n"
        upstream = create_connection((parsed.hostname, port), timeout=20)
        client.settimeout(None)
        upstream.settimeout(RELAY_IDLE_TIMEOUT); client.settimeout(RELAY_IDLE_TIMEOUT)
        upstream.sendall(request.encode("iso-8859-1") + rest)
        relay(client, upstream)
    except: pass
    finally:
        client.close()
        if upstream: upstream.close()

def proxy_client(client: socket.socket, address: tuple[str, int]) -> None:
    try:
        client.settimeout(30)
        first = recv_exact(client, 1)
        if first == b"\x05": socks5_client(client, first)
        else: http_client(client, first)
    except:
        try: client.close()
        except: pass
    finally:
        CONNECTION_SLOTS.release()

def start_proxy_server(host: str, port: int) -> None:
    servers = []
    public_listener = host in {"0.0.0.0", "::", "*"}
    # Private Docker bridge addresses are intentionally supported here. The
    # controller validates the value before it reaches this process.
    ipv4_host = "0.0.0.0" if public_listener else (host or "127.0.0.1")
    retry_delay = 1
    attempts = 0
    while attempts < 5:
        attempts += 1
        try:
            server4 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            server4.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server4.bind((ipv4_host, port))
            server4.listen(256)
            servers.append(server4)
            break
        except Exception as error:
            print(f"[proxy] IPv4 bind failed on {port}: {error}", flush=True)
            try: server4.close()
            except Exception: pass
            print(f"[proxy] retrying bind in {retry_delay}s", flush=True)
            time.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 30)
    if not servers:
        print(f"[proxy] IPv4 unavailable after {attempts} attempts; trying IPv6-only mode", flush=True)

    if public_listener:
        try:
            server6 = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
            server6.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server6.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
            server6.bind(("::", port))
            server6.listen(256)
            servers.append(server6)
        except Exception as error:
            print(f"[proxy] IPv6 listener unavailable on {port}: {error}", flush=True)
            try: server6.close()
            except Exception: pass
    if not servers:
        raise OSError(f"unable to bind proxy port {port} on IPv4 or IPv6")
    listener_ready.set()
    while True:
        try:
            readable, _, _ = select.select(servers, [], [], 1.0)
            for server in readable:
                client, address = server.accept()
                if not CONNECTION_SLOTS.acquire(blocking=False):
                    client.close()
                    continue
                try:
                    threading.Thread(target=proxy_client, args=(client, address), daemon=True).start()
                except Exception:
                    CONNECTION_SLOTS.release()
                    client.close()
        except Exception:
            time.sleep(0.5)
