import ast
import pathlib
import unittest


SOURCE_PATH = pathlib.Path(__file__).parents[1] / "static" / "vps" / "agent.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)
NAMES = {"validate_mtproxy_secret", "build_mtproxy_config", "mtg_asset"}
SELECTED = [
    node for node in TREE.body
    if isinstance(node, ast.FunctionDef) and node.name in NAMES
    or isinstance(node, ast.Assign) and any(
        isinstance(target, ast.Name) and target.id in {"MTG_VERSION", "MTG_ASSETS"}
        for target in node.targets
    )
]
NAMESPACE = {"re": __import__("re"), "platform": __import__("platform")}
exec(compile(ast.Module(body=SELECTED, type_ignores=[]), str(SOURCE_PATH), "exec"), NAMESPACE)


class AgentMtproxyTests(unittest.TestCase):
    def test_faketls_secret_is_bound_to_domain(self):
        domain = "proxy.example.com"
        secret = "ee" + "11" * 16 + domain.encode().hex()
        self.assertEqual(NAMESPACE["validate_mtproxy_secret"](secret, domain), secret)
        with self.assertRaises(ValueError):
            NAMESPACE["validate_mtproxy_secret"](secret, "other.example.com")
        with self.assertRaises(ValueError):
            NAMESPACE["validate_mtproxy_secret"]("ee1234", domain)
        with self.assertRaises(ValueError):
            NAMESPACE["validate_mtproxy_secret"]("ee" + "11" * 16, "")

    def test_mtg_config_uses_faketls_secret_and_public_listener(self):
        domain = "proxy.example.com"
        secret = "ee" + "22" * 16 + domain.encode().hex()
        config = NAMESPACE["build_mtproxy_config"]({
            "id": "node_1", "port": 443, "sni": domain, "private_key": secret,
        }, "0.0.0.0")
        self.assertIn(f'secret = "{secret}"', config)
        self.assertIn('bind-to = "0.0.0.0:443"', config)
        ipv6 = NAMESPACE["build_mtproxy_config"]({
            "id": "node_1", "port": 443, "sni": domain, "private_key": secret,
        }, "::")
        self.assertIn('bind-to = "[::]:443"', ipv6)

    def test_mtg_release_is_pinned_for_supported_architectures(self):
        self.assertEqual(NAMESPACE["MTG_VERSION"], "2.2.8")
        assets = NAMESPACE["MTG_ASSETS"]
        self.assertEqual(assets["x86_64"], ("amd64", "7ef19d079d85f4e00d4f8334ec1f3f3c8718e3d0ed1f3109ea9a8673138a2102"))
        self.assertEqual(assets["aarch64"], ("arm64", "562a94dd4cafcb8f179b76cfeafb76da12747c8e230bc76235bf8746cc189644"))


if __name__ == "__main__":
    unittest.main()
