import ast
import pathlib
import socket
import unittest
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


if __name__ == "__main__":
    unittest.main()
