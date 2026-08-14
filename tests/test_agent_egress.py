import ast
import ipaddress
import json
import pathlib
import unittest


SOURCE_PATH = pathlib.Path(__file__).parents[1] / "static" / "vps" / "agent.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)
FUNCTION_NAMES = {"normalize_check_host", "normalize_proxy_custom_domains", "_normalize_egress_config", "_runtime_egress_args"}
SELECTED = [node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name in FUNCTION_NAMES]
NAMESPACE = {"ipaddress": ipaddress, "json": json, "re": __import__("re"), "EGRESS_MODES": {"native", "residential", "socks5", "warp_ipv4", "warp_ipv6", "warp_dual"}, "PROXY_CATEGORIES": {"youtube", "ai", "google", "streaming", "custom"}}
exec(compile(ast.Module(body=SELECTED, type_ignores=[]), str(SOURCE_PATH), "exec"), NAMESPACE)


class AgentEgressTests(unittest.TestCase):
    def test_manual_socks5_runtime_uses_the_applied_snapshot(self):
        applied = NAMESPACE["_normalize_egress_config"]({
            "mode": "socks5",
            "proxy_mode": "global",
            "proxy_categories": "",
            "socks5": {"addr": "old.proxy.example", "port": 1080, "user": "old-user", "pass": "old-pass"},
        })
        runtime_socks, runtime_warp = NAMESPACE["_runtime_egress_args"](applied, {}, "127.0.0.1")
        self.assertEqual(runtime_warp, "off")
        self.assertEqual(runtime_socks["addr"], "old.proxy.example")
        self.assertEqual(runtime_socks["user"], "old-user")
        self.assertEqual(runtime_socks["pass"], "old-pass")

    def test_warp_and_socks5_runtime_modes_are_mutually_exclusive(self):
        warp = NAMESPACE["_normalize_egress_config"]({"mode": "warp_dual"})
        runtime_socks, runtime_warp = NAMESPACE["_runtime_egress_args"](warp, {}, "127.0.0.1")
        self.assertEqual(runtime_socks, {})
        self.assertEqual(runtime_warp, "dual")

    def test_selective_categories_are_normalized_before_runtime(self):
        config = NAMESPACE["_normalize_egress_config"]({
            "mode": "residential",
            "proxy_mode": "selective",
            "proxy_categories": "youtube,unknown,ai,youtube,custom",
            "proxy_custom_domains": ["*.Example.COM", "例子.测试"],
        })
        self.assertEqual(config["proxy_categories"], "youtube,ai,custom")
        self.assertEqual(config["proxy_custom_domains"], ["example.com", "xn--fsqu00a.xn--0zwm56d"])
        runtime_socks, _ = NAMESPACE["_runtime_egress_args"](config, {"addr": "172.17.0.1", "port": 7920}, "172.17.0.1")
        self.assertEqual(json.loads(runtime_socks["domains"]), {"categories": ["youtube", "ai", "custom"], "custom_domains": ["example.com", "xn--fsqu00a.xn--0zwm56d"]})


if __name__ == "__main__":
    unittest.main()
