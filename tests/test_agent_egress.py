import ast
import ipaddress
import json
import pathlib
import unittest


SOURCE_PATH = pathlib.Path(__file__).parents[1] / "static" / "vps" / "agent.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)
FUNCTION_NAMES = {"normalize_check_host", "normalize_proxy_custom_domains", "_normalize_egress_config", "_runtime_egress_args", "_warp_candidate_endpoints", "_rank_warp_candidates", "_normalize_warp_optimizer_policy", "_select_warp_exit_ip"}
SELECTED = [node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name in FUNCTION_NAMES]
NAMESPACE = {"ipaddress": ipaddress, "json": json, "re": __import__("re"), "random": __import__("random"), "EGRESS_MODES": {"native", "residential", "socks5", "warp_ipv4", "warp_ipv6", "warp_dual"}, "PROXY_CATEGORIES": {"youtube", "ai", "google", "streaming", "custom"}}
exec(compile(ast.Module(body=SELECTED, type_ignores=[]), str(SOURCE_PATH), "exec"), NAMESPACE)


class AgentEgressTests(unittest.TestCase):
    def test_dual_stack_verification_reports_the_preferred_ipv4_exit(self):
        select = NAMESPACE["_select_warp_exit_ip"]
        exits = {"ipv4": "104.28.1.1", "ipv6": "2606:4700:100::1"}
        self.assertEqual(select("dual", exits), "104.28.1.1")
        self.assertEqual(select("ipv4", exits), "104.28.1.1")
        self.assertEqual(select("ipv6", exits), "2606:4700:100::1")

    def test_warp_candidates_keep_current_endpoint_and_are_bounded(self):
        profile = {"peer_address": "162.159.192.1", "peer_port": 2408}
        candidates = NAMESPACE["_warp_candidate_endpoints"](profile, ["162.159.192.2", "2606:4700:d0::a29f:c001"], seed=7, limit=24)
        self.assertEqual(candidates[0], {"address": "162.159.192.1", "port": 2408, "current": True})
        self.assertLessEqual(len(candidates), 24)
        self.assertEqual(len({(item["address"], item["port"]) for item in candidates}), len(candidates))
        self.assertTrue(all(1 <= item["port"] <= 65535 for item in candidates))

    def test_warp_ranking_prefers_valid_low_loss_candidates(self):
        results = [
            {"address": "162.159.192.1", "port": 2408, "success": True, "loss_pct": 20, "latency_ms": 12},
            {"address": "162.159.192.2", "port": 2408, "success": True, "loss_pct": 0, "latency_ms": 45},
            {"address": "162.159.192.3", "port": 2408, "success": False, "loss_pct": 100, "latency_ms": 0},
        ]
        ranked = NAMESPACE["_rank_warp_candidates"](results)
        self.assertEqual(ranked[0]["address"], "162.159.192.2")
        self.assertEqual(ranked[-1]["address"], "162.159.192.3")

    def test_warp_optimizer_policy_is_closed_by_default(self):
        normalize = NAMESPACE["_normalize_warp_optimizer_policy"]
        self.assertEqual(normalize("manual"), "manual")
        self.assertEqual(normalize("on_failure"), "on_failure")
        self.assertEqual(normalize("first_enable"), "first_enable")
        self.assertEqual(normalize("always"), "manual")

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
