import pathlib
import sys
import unittest


ROOT = pathlib.Path(__file__).parents[1]
sys.path.insert(0, str(ROOT / "static" / "vps"))

import lite_manager


class VPNGateFallbackTests(unittest.TestCase):
    def test_official_index_parser_builds_bounded_https_download(self):
        html = """
        <table><tr>
          <td><img src="../images/flags/JP.png"></td>
          <td>Ping: <b>12 ms</b></td>
          <td><a href="do_openvpn.aspx?fqdn=node.opengw.net&amp;ip=219.100.37.200&amp;tcp=443&amp;udp=1195&amp;sid=123456789&amp;hid=987654321">OpenVPN</a></td>
        </tr></table>
        """
        candidates = lite_manager._parse_vpngate_index(html)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["country"], "JP")
        self.assertEqual(candidates[0]["ip"], "219.100.37.200")
        self.assertEqual(candidates[0]["ping"], 12)
        self.assertTrue(candidates[0]["download_url"].startswith("https://www.vpngate.net/common/openvpn_download.aspx?"))
        self.assertIn("host=219.100.37.200", candidates[0]["download_url"])
        self.assertIn("port=443", candidates[0]["download_url"])

    def test_official_index_parser_rejects_private_addresses(self):
        html = """
        <table><tr>
          <td><img src="../images/flags/JP.png"></td>
          <td>Ping: 1 ms</td>
          <td><a href="do_openvpn.aspx?ip=10.0.0.1&amp;tcp=443&amp;udp=0&amp;sid=123&amp;hid=456">OpenVPN</a></td>
        </tr></table>
        """
        self.assertEqual(lite_manager._parse_vpngate_index(html), [])

    def test_csv_parser_rejects_html_success_pages(self):
        with self.assertRaisesRegex(ValueError, "non-CSV"):
            lite_manager._parse_vpngate_csv("<html><body></body></html>")

    def test_source_reader_accepts_only_official_https_origin(self):
        with self.assertRaisesRegex(ValueError, "untrusted"):
            lite_manager._read_vpngate_response("http://www.vpngate.net/api/iphone/", 1024)
        with self.assertRaisesRegex(ValueError, "untrusted"):
            lite_manager._read_vpngate_response("https://example.com/api/iphone/", 1024)


if __name__ == "__main__":
    unittest.main()
