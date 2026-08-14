import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { __test } from '../functions/api/[[path]].js';

const manager = fs.readFileSync(new URL('../static/vps/lite_manager.py', import.meta.url), 'utf8');
const agent = fs.readFileSync(new URL('../static/vps/agent.py', import.meta.url), 'utf8');
const proxyServer = fs.readFileSync(new URL('../static/vps/proxy_server.py', import.meta.url), 'utf8');
const installer = fs.readFileSync(new URL('../static/vps/residential-proxy.sh', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const realtime = fs.readFileSync(new URL('../realtime/src/index.js', import.meta.url), 'utf8');
const frontendState = fs.readFileSync(new URL('../frontend/src/composables/useKuiState.js', import.meta.url), 'utf8');
const { proxyPublicListenerEnabled, sanitizeProxyListenHost, validateProxyReport } = __test;

test('proxy-lite reports the active tunnel exit IP', () => {
    assert.match(manager, /"node_ip": tun\.egress_ip if tun\.egress_ip else tun\.entry_ip,\s*"exit_ip": tun\.egress_ip if tun\.egress_ip else tun\.entry_ip/);
});

test('Worker accepts legacy residential reports using node_ip as exit fallback', () => {
    assert.match(api, /item\.exit_ip \|\| item\.node_ip/);
    assert.match(api, /const activeExitIp = active\?\.exit_ip \|\| active\?\.node_ip \|\| ''/);
});

test('server cards expose distinct realtime active and standby residential exits', () => {
    const frontend = fs.readFileSync(new URL('../frontend/src/pages/ServersPage.vue', import.meta.url), 'utf8');
    assert.match(api, /const standby = Array\.isArray\(details\) \? details\.find\(item => !item\?\.active/);
    assert.match(api, /server\.residential_standby_exit_ip = standbyExitIp/);
    assert.match(frontend, /当前实时住宅出口/);
    assert.match(frontend, /主 \{\{ vps\.residential_active_exit_ip/);
    assert.match(frontend, /备 \{\{ vps\.residential_standby_exit_ip/);
    assert.match(frontend, /配置应用时验证出口/);
    assert.match(frontendState, /residential_active_exit_ip: active\?\.exit_ip \|\| active\?\.node_ip/);
    assert.match(frontendState, /residential_standby_exit_ip: standby\?\.exit_ip \|\| standby\?\.node_ip/);
});

test('validates private Docker bridge listener addresses', async () => {
    assert.equal(sanitizeProxyListenHost('172.17.0.1'), '172.17.0.1');
    assert.equal(sanitizeProxyListenHost(''), '');
    assert.equal(sanitizeProxyListenHost('172.999.0.1'), null);
    assert.equal(sanitizeProxyListenHost('host.docker.internal'), null);
});

test('per-VPS public listener setting overrides the deployment default', () => {
    assert.equal(proxyPublicListenerEnabled({}, { PROXY_PUBLIC_LISTENER: 'true' }), true);
    assert.equal(proxyPublicListenerEnabled({}, { PROXY_PUBLIC_LISTENER: 'false' }), false);
    assert.equal(proxyPublicListenerEnabled({ public_listener: false }, { PROXY_PUBLIC_LISTENER: 'true' }), false);
    assert.equal(proxyPublicListenerEnabled({ public_listener: true }, { PROXY_PUBLIC_LISTENER: 'false' }), true);
    assert.match(api, /server\.proxy_public_listener = proxyPublicListenerEnabled\(slotConfig, env\)/);
    assert.match(api, /server\.proxy_public_port =/);
    assert.match(api, /if \(!proxyPublicListenerEnabled\(slotConfig, env\)\) continue/);
    assert.match(api, /public_listener must be boolean/);
    assert.match(api, /PROXY_USER and PROXY_PASS must be configured before enabling public listener/);
});

test('rejects markup in proxy report IP fields', () => {
    const report = validateProxyReport({
        ip: '203.0.113.8',
        details: [{ tunnel: 'tun_main', active: true, country: 'JP', port: 7920, node_ip: '</pre><script>alert(1)</script>' }],
    });
    assert.equal(report.details[0].node_ip, '');
    assert.equal(report.details[0].exit_ip, '');
});

test('proxy-lite keeps realtime heartbeats responsive during HTTP mirror stalls', () => {
    assert.match(manager, /submit_http_report\(status, background=True\)/);
    assert.match(manager, /last_http_report_attempt = time\.time\(\)/);
    assert.match(manager, /time\.time\(\) - last_http_report_attempt >= REALTIME_HTTP_INTERVAL/);
    assert.match(manager, /C2_REQUEST_TIMEOUT = 12/);
});

test('proxy-lite rate limits repeated control-plane and reservoir log noise', () => {
    assert.match(manager, /record_control_failure\("report", error, realtime_ok=realtime_ok\)/);
    assert.match(manager, /if reservoir_count != last_reservoir_log_count:/);
});

test('realtime proxy status refreshes the residential availability record', () => {
    assert.match(realtime, /persistProxyStatus\(attachment\.ip, nextRoleState, attachment\.lastSeen, criticalChange\)/);
    assert.match(realtime, /INSERT INTO proxy_ctrl_servers/);
    assert.match(realtime, /INSERT INTO server_logs/);
});

test('residential apply failures include the controller readiness reason', () => {
    assert.match(agent, /residential\.get\("reason"\)/);
});

test('residential data-plane verification follows the configured listener with safe fallbacks', () => {
    assert.match(api, /const residentialAddr = listenHost \|\| '127\.0\.0\.1'/);
    assert.match(api, /addr: residentialAddr[\s\S]{0,120}check_addr: residentialAddr/);
    assert.match(agent, /proxy\.get\("addr"\), proxy\.get\("check_addr"\), "127\.0\.0\.1"/);
    assert.match(agent, /residential_addr == "127\.0\.0\.1" and egress_check_host != "127\.0\.0\.1"/);
    assert.match(agent, /"addr": residential_addr, "check_addr": egress_check_host/);
    assert.match(agent, /residential proxy verification failed via/);
});

test('residential landing server resolves domains through its active tunnel', () => {
    assert.match(proxyServer, /def resolve_on_landing\(host: str, port: int, interface: str\)/);
    assert.match(proxyServer, /dns_socket\.setsockopt\(socket\.SOL_SOCKET, SO_BINDTODEVICE, interface\.encode\("utf-8"\)\)/);
    assert.match(proxyServer, /addrinfos = resolve_on_landing\(host, port, bind_interface\)/);
    assert.doesNotMatch(proxyServer, /socket\.getaddrinfo\(host, port/);
    assert.match(proxyServer, /flags & 0x0200/);
    assert.match(proxyServer, /socket\.SOCK_STREAM/);
    assert.match(proxyServer, /recv_exact\(dns_socket, 2\)/);
});

test('residential SOCKS5 server supports UDP ASSOCIATE through the active tunnel', () => {
    assert.match(proxyServer, /command == 3/);
    assert.match(proxyServer, /def relay_socks5_udp/);
    assert.match(proxyServer, /SO_BINDTODEVICE/);
    assert.match(proxyServer, /if fragment != 0/);
    assert.doesNotMatch(proxyServer, /if command != 1:[\s\S]{0,100}x05\\x07/);
});

test('residential tunnel routing cannot delete or flush cloud policy routes', () => {
    assert.match(manager, /KUI_ROUTE_TABLES\s*=\s*\{"tun_main": 20101, "tun_backup": 20102\}/);
    assert.doesNotMatch(manager, /\["ip", "rule", "del", "pref", str\(table_id\)\]/);
    assert.doesNotMatch(manager, /\["ip", "route", "flush", "table", str\(table_id\)\]/);
    assert.match(manager, /_cleanup_tunnel_routing\(tun_name, legacy_table/);
    assert.match(manager, /"route", "replace", "default", "dev", tun_name/);
});

test('residential OpenVPN cannot alter host routes or forwarding used by SSH', () => {
    assert.match(manager, /"--route-nopull", "--route-noexec"/);
    assert.match(manager, /"--pull-filter", "ignore", "redirect-gateway"/);
    assert.doesNotMatch(manager, /net\.ipv4\.ip_forward=1|net\.ipv6\.conf\.all\.forwarding=1/);
    assert.doesNotMatch(installer, /net\.ipv4\.ip_forward=1|net\.ipv6\.conf\.all\.forwarding=1/);
});

test('realtime egress results are persisted and acknowledged without HTTP', () => {
    assert.match(realtime, /persistEgressResult\(attachment\.ip, result\)/);
    assert.match(realtime, /UPDATE servers SET egress_applied_mode/);
    assert.match(realtime, /type: "config\.result\.ack"/);
    assert.match(agent, /message\.get\("type"\) == "config\.result\.ack"/);
    assert.match(agent, /def _deliver_egress_result\(payload\):[\s\S]*realtime_channel\.send\(payload, "config\.result"\)[\s\S]*return _post_warp_result\(payload\)/);
});

test('agent control requests bypass environment proxies and retry transient stalls', () => {
    assert.match(agent, /ProxyHandler\(\{\}\)/);
    assert.match(agent, /for attempt in range\(CONTROL_REQUEST_ATTEMPTS\)/);
    assert.match(agent, /_controller_json_request\(f"\{API_URL\}\?ip=\{VPS_IP\}"/);
    assert.match(manager, /ProxyHandler\(\{\}\)/);
});
