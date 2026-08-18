import ast
import http.client
import pathlib
import socket
import unittest
import urllib.request
from unittest import mock


ROOT = pathlib.Path(__file__).parents[1]


def load_connection_helper(relative_path):
    source_path = ROOT / relative_path
    tree = ast.parse(source_path.read_text(encoding="utf-8"))
    selected = [
        node for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name == "_prefer_ipv4_create_connection"
    ]
    namespace = {"socket": socket}
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(source_path), "exec"), namespace)
    return namespace["_prefer_ipv4_create_connection"]


def load_https_types(relative_path):
    source_path = ROOT / relative_path
    tree = ast.parse(source_path.read_text(encoding="utf-8"))
    names = {"_prefer_ipv4_create_connection", "_PreferIPv4HTTPSConnection", "_PreferIPv4HTTPSHandler"}
    selected = [
        node for node in tree.body
        if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name in names
    ]
    namespace = {"socket": socket, "http": http, "urllib": urllib}
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(source_path), "exec"), namespace)
    return namespace["_PreferIPv4HTTPSConnection"], namespace["_PreferIPv4HTTPSHandler"]


class FakeSocket:
    def __init__(self, family, failures):
        self.family = family
        self.failures = failures
        self.closed = False

    def settimeout(self, _timeout):
        pass

    def bind(self, _source):
        pass

    def connect(self, _address):
        if self.family in self.failures:
            raise OSError(self.failures[self.family])

    def close(self):
        self.closed = True


class IPv4FallbackTests(unittest.TestCase):
    def exercise_helper(self, helper):
        infos = [
            (socket.AF_INET6, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("2001:db8::1", 443, 0, 0)),
            (socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("192.0.2.10", 443)),
        ]
        families = []

        def make_socket(family, _socktype, _proto):
            families.append(family)
            return FakeSocket(family, {})

        with mock.patch.object(socket, "getaddrinfo", return_value=infos), mock.patch.object(socket, "socket", side_effect=make_socket):
            connected = helper(("panel.example.com", 443), timeout=5)
        self.assertEqual(families, [socket.AF_INET])
        self.assertEqual(connected.family, socket.AF_INET)

        families.clear()

        def make_fallback_socket(family, _socktype, _proto):
            families.append(family)
            return FakeSocket(family, {socket.AF_INET: "IPv4 unavailable"})

        with mock.patch.object(socket, "getaddrinfo", return_value=infos), mock.patch.object(socket, "socket", side_effect=make_fallback_socket):
            connected = helper(("panel.example.com", 443), timeout=5)
        self.assertEqual(families, [socket.AF_INET, socket.AF_INET6])
        self.assertEqual(connected.family, socket.AF_INET6)

    def test_agent_prefers_ipv4_and_falls_back_to_ipv6(self):
        self.exercise_helper(load_connection_helper("static/vps/agent.py"))

    def test_residential_manager_prefers_ipv4_and_falls_back_to_ipv6(self):
        self.exercise_helper(load_connection_helper("static/vps/lite_manager.py"))

    def exercise_python_313_handler(self, relative_path):
        connection_type, handler_type = load_https_types(relative_path)
        handler = handler_type()
        if hasattr(handler, "_check_hostname"):
            del handler._check_hostname
        with mock.patch.object(handler, "do_open", return_value="response") as do_open:
            self.assertEqual(handler.https_open(object()), "response")
        self.assertIs(do_open.call_args.args[0], connection_type)
        self.assertNotIn("check_hostname", do_open.call_args.kwargs)

    def test_agent_https_handler_supports_python_313(self):
        self.exercise_python_313_handler("static/vps/agent.py")

    def test_residential_https_handler_supports_python_313(self):
        self.exercise_python_313_handler("static/vps/lite_manager.py")


if __name__ == "__main__":
    unittest.main()
