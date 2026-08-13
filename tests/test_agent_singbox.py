import ast
import pathlib
import unittest


SOURCE_PATH = pathlib.Path(__file__).parents[1] / "static" / "vps" / "agent.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)
FUNCTION_NAMES = {"normalize_ss2022_network", "node_transports", "tune_inbound", "tune_outbound", "get_port_traffic", "build_selective_proxy_rules", "build_egress_dns_policy"}
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
        rule_sets, rules, dns_tags = NAMESPACE["build_selective_proxy_rules"](
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

        route, reject_ipv6 = rules
        self.assertEqual(route["inbound"], ["in-node-a", "in-node-b"])
        self.assertEqual(route["rule_set"], ["kui-youtube", "kui-ai-domain", "kui-ai-ip", "kui-google", "kui-stream-domain", "kui-stream-ip"])
        self.assertEqual(route["action"], "route")
        self.assertEqual(route["outbound"], "socks5-outbound")
        self.assertEqual(reject_ipv6, {"inbound": ["in-node-a", "in-node-b"], "ip_version": 6, "action": "reject"})
        self.assertEqual(dns_tags, ["kui-youtube", "kui-ai-domain", "kui-google", "kui-stream-domain"])

    def test_selective_proxy_rules_reject_empty_or_unknown_categories(self):
        for categories in ([], ["unknown"]):
            with self.assertRaises(RuntimeError):
                NAMESPACE["build_selective_proxy_rules"](categories, ["in-node"], "socks5-outbound")

    def test_native_dns_is_local_without_pre_resolving_proxy_destinations(self):
        dns, prefix, fallback = NAMESPACE["build_egress_dns_policy"](["in-node"], "native")
        self.assertEqual(dns["servers"], [{"type": "local", "tag": "local-dns"}])
        self.assertEqual(dns["final"], "local-dns")
        self.assertTrue(dns["independent_cache"])
        self.assertTrue(dns["reverse_mapping"])
        self.assertNotIn("client_subnet", dns)
        self.assertEqual(prefix[0], {"inbound": ["in-node"], "action": "sniff", "timeout": "1s"})
        self.assertEqual(prefix[1], {"inbound": ["in-node"], "protocol": "dns", "action": "hijack-dns"})
        self.assertFalse(any(rule.get("action") == "resolve" for rule in prefix))
        self.assertEqual(fallback, [])

    def test_global_proxy_preserves_domains_for_remote_socks_resolution(self):
        dns, prefix, fallback = NAMESPACE["build_egress_dns_policy"](
            ["in-node"], "proxy-global", outbound_tag="socks5-outbound"
        )
        proxy_dns = next(server for server in dns["servers"] if server["tag"] == "proxy-dns")
        self.assertEqual(proxy_dns["detour"], "socks5-outbound")
        self.assertEqual(dns["final"], "proxy-dns")
        self.assertFalse(any(rule.get("action") == "resolve" for rule in prefix))
        self.assertEqual(fallback, [])

    def test_selective_proxy_dns_reuses_domain_rules_and_keeps_local_fallback(self):
        dns, prefix, fallback = NAMESPACE["build_egress_dns_policy"](
            ["in-node"],
            "proxy-selective",
            outbound_tag="socks5-outbound",
            dns_rule_tags=["kui-ai-domain"],
        )
        self.assertEqual(dns["final"], "local-dns")
        self.assertEqual(dns["rules"], [{"rule_set": ["kui-ai-domain"], "action": "route", "server": "proxy-dns", "strategy": "prefer_ipv4"}])
        self.assertFalse(any(rule.get("action") == "resolve" for rule in prefix))
        self.assertEqual(fallback, [])

    def test_mesh_dns_queries_follow_the_same_landing_outbound(self):
        dns, prefix, fallback = NAMESPACE["build_egress_dns_policy"](
            ["in-node-a", "in-node-b"],
            "native",
            detoured_dns=[("in-node-b", "mesh-out-b"), ("in-node-a", "mesh-out-a")],
        )
        self.assertEqual(
            [(server["tag"], server["detour"]) for server in dns["servers"][1:]],
            [("landing-dns-0", "mesh-out-a"), ("landing-dns-1", "mesh-out-b")],
        )
        self.assertEqual(
            dns["rules"],
            [
                {"inbound": ["in-node-a"], "action": "route", "server": "landing-dns-0", "strategy": "prefer_ipv4"},
                {"inbound": ["in-node-b"], "action": "route", "server": "landing-dns-1", "strategy": "prefer_ipv4"},
            ],
        )
        self.assertFalse(any(rule.get("action") == "resolve" for rule in prefix))
        self.assertEqual(fallback, [])

    def test_warp_dns_uses_doh_through_warp_with_matching_address_family(self):
        dns, prefix, fallback = NAMESPACE["build_egress_dns_policy"](
            ["in-node"], "warp", outbound_tag="warp-out", strategy="ipv6_only"
        )
        warp_dns = next(server for server in dns["servers"] if server["tag"] == "warp-dns")
        self.assertEqual(warp_dns["server"], "2606:4700:4700::1111")
        self.assertEqual(warp_dns["detour"], "warp-out")
        self.assertEqual(dns["final"], "warp-dns")
        self.assertEqual(prefix[-1], {"inbound": ["in-node"], "action": "resolve", "server": "warp-dns", "strategy": "ipv6_only"})
        self.assertEqual(fallback, [])


if __name__ == "__main__":
    unittest.main()
