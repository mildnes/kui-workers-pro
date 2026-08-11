import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { __test } from '../functions/api/[[path]].js';

const manager = fs.readFileSync(new URL('../static/vps/lite_manager.py', import.meta.url), 'utf8');
const agent = fs.readFileSync(new URL('../static/vps/agent.py', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const realtime = fs.readFileSync(new URL('../realtime/src/index.js', import.meta.url), 'utf8');
const { sanitizeProxyListenHost, validateProxyReport } = __test;

test('proxy-lite reports the active tunnel exit IP', () => {
    assert.match(manager, /"node_ip": tun\.egress_ip if tun\.egress_ip else tun\.entry_ip,\s*"exit_ip": tun\.egress_ip if tun\.egress_ip else tun\.entry_ip/);
});

test('Worker accepts legacy residential reports using node_ip as exit fallback', () => {
    assert.match(api, /item\.exit_ip \|\| item\.node_ip/);
    assert.match(api, /const activeExitIp = active\?\.exit_ip \|\| active\?\.node_ip \|\| ''/);
});

test('validates private Docker bridge listener addresses', async () => {
    assert.equal(sanitizeProxyListenHost('172.17.0.1'), '172.17.0.1');
    assert.equal(sanitizeProxyListenHost(''), '');
    assert.equal(sanitizeProxyListenHost('172.999.0.1'), null);
    assert.equal(sanitizeProxyListenHost('host.docker.internal'), null);
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
