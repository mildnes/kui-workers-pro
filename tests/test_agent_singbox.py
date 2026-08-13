import ast
import pathlib
import unittest


SOURCE_PATH = pathlib.Path(__file__).parents[1] / "static" / "vps" / "agent.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)
FUNCTION_NAMES = {"normalize_ss2022_network", "node_transports", "tune_inbound", "tune_outbound", "get_port_traffic", "build_selective_proxy_rules"}
SELECTED = [
    node for node in TREE.body
    if (isinstance(node, ast.FunctionDef) and node.name in FUNCTION_NAMES)
    or (isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == "SELECTIVE_PROXY_RULE_SETS" for target in node.targets))
]
COUNTERS = {"tcp": 120, "udp": 80}
NAMESPACE = {"_read_iptables_port_bytes": lambda _port, protocol: COUNTERS.get(protocol)}
exec(compile(ast.Module(body=SELECTED, type_ignores=[]), str(SOURCE_PATH), "exec"), NAMESPACE)


class AgentSingBoxTests(unittest.TestCase):
    def test_ss2022_network_defaults_to_tcp_and_udp(self):
        self.assertEqual(NAMESPACE["normalize_ss2022_network"](""), ["tcp", "udp"])
        self.assertEqual(NAMESPACE["normalize_ss2022_network"]("tcp"), ["tcp"])
        self.assertEqual(NAMESPACE["normalize_ss2022_network"]("udp"), ["udp"])
        with self.assertRaises(ValueError):
            NAMESPACE["normalize_ss2022_network"]("icmp")

    def test_dual_network_traffic_sums_persistent_counters(self):
        self.assertEqual(NAMESPACE["get_port_traffic"](8388, "both", "node-1"), 200)
        self.assertEqual(NAMESPACE["get_port_traffic"](8388, "tcp", "node-1"), 120)

    def test_connection_tuning_is_transport_aware(self):
        tcp = NAMESPACE["tune_inbound"]({}, ["tcp"])
        udp = NAMESPACE["tune_inbound"]({}, ["udp"])
        self.assertTrue(tcp["reuse_addr"])
        self.assertTrue(tcp["tcp_fast_open"])
        self.assertNotIn("udp_timeout", tcp)
        self.assertEqual(udp["udp_timeout"], "5m")
        self.assertNotIn("tcp_fast_open", udp)

    def test_selective_proxy_categories_use_versioned_remote_rule_sets(self):
        rule_sets, rules = NAMESPACE["build_selective_proxy_rules"](
            ["youtube", "ai", "google", "streaming"],
            ["in-node-b", "in-node-a"],
            "socks5-outbound",
        )

        self.assertEqual(len(rule_sets), 6)
        self.assertEqual(
            [item["tag"] for item in rule_sets],
            ["kui-youtube", "kui-ai-domain", "kui-ai-ip", "kui-google", "kui-stream-domain", "kui-stream-ip"],
        )
        self.assertEqual([item["format"] for item in rule_sets], ["binary", "source", "source", "binary", "source", "source"])
        self.assertTrue(all(item["type"] == "remote" for item in rule_sets))
        self.assertTrue(all(item["download_detour"] == "direct-out" for item in rule_sets))
        self.assertTrue(all(item["update_interval"] == "1d" for item in rule_sets))
        self.assertTrue(all(item["url"].startswith("https://raw.githubusercontent.com/") for item in rule_sets))

        sniff, route, reject_ipv6 = rules
        self.assertEqual(sniff, {"inbound": ["in-node-a", "in-node-b"], "action": "sniff", "timeout": "1s"})
        self.assertEqual(route["inbound"], ["in-node-a", "in-node-b"])
        self.assertEqual(route["rule_set"], [item["tag"] for item in rule_sets])
        self.assertEqual(route["action"], "route")
        self.assertEqual(route["outbound"], "socks5-outbound")
        self.assertEqual(reject_ipv6, {"inbound": ["in-node-a", "in-node-b"], "ip_version": 6, "action": "reject"})

    def test_selective_proxy_rules_reject_empty_or_unknown_categories(self):
        for categories in ([], ["unknown"]):
            with self.assertRaises(RuntimeError):
                NAMESPACE["build_selective_proxy_rules"](categories, ["in-node"], "socks5-outbound")


if __name__ == "__main__":
    unittest.main()
