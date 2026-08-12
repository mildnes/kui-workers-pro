import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { __test } from '../functions/api/[[path]].js';

const frontend = fs.readFileSync(new URL('../frontend/src/composables/useKuiState.js', import.meta.url), 'utf8');
const serversPage = fs.readFileSync(new URL('../frontend/src/pages/ServersPage.vue', import.meta.url), 'utf8');
const appStyles = fs.readFileSync(new URL('../frontend/src/styles/app.css', import.meta.url), 'utf8');

const UUID = '11111111-1111-4111-8111-111111111111';
const REALITY_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function baseNode(protocol, overrides = {}) {
    return { id: 'node_1', vps_ip: '203.0.113.8', protocol, port: 443, uuid: UUID, ...overrides };
}

test('single-node payloads normalize fields needed by sing-box', () => {
    const { normalizeNodePayload } = __test;
    const reality = normalizeNodePayload(baseNode('XTLS-Reality', {
        sni: '', private_key: REALITY_KEY, public_key: REALITY_KEY, short_id: 'aabbccdd',
    }));
    assert.equal(reality.sni, 'addons.mozilla.org');
    assert.equal(reality.network, 'tcp');
    assert.equal(normalizeNodePayload(baseNode('H2-Reality', { private_key: REALITY_KEY, public_key: REALITY_KEY, short_id: 'aabbccdd' })).network, 'http');
    assert.equal(normalizeNodePayload(baseNode('gRPC-Reality', { private_key: REALITY_KEY, public_key: REALITY_KEY, short_id: 'aabbccdd' })).network, 'grpc');
    assert.equal(normalizeNodePayload(baseNode('Trojan', { uuid: 'credential', private_key: 'secret' })).sni, 'addons.mozilla.org');
    assert.equal(normalizeNodePayload(baseNode('dokodemo-door', { uuid: '', relay_type: 'external', target_ip: 'relay.example.com', target_port: 8443 })).target_ip, 'relay.example.com');
});

test('invalid credentials and incomplete relay records are rejected before storage', () => {
    const { normalizeNodePayload } = __test;
    assert.throws(() => normalizeNodePayload(baseNode('XTLS-Reality', { private_key: '', public_key: REALITY_KEY, short_id: 'aabbccdd' })), /private key/i);
    assert.throws(() => normalizeNodePayload(baseNode('TUIC', { uuid: 'not-a-uuid', private_key: 'secret' })), /UUID/i);
    assert.throws(() => normalizeNodePayload(baseNode('Socks5', { uuid: 'user', private_key: '' })), /password/i);
    assert.throws(() => normalizeNodePayload(baseNode('dokodemo-door', { uuid: '', relay_type: 'internal', target_id: '' })), /target ID/i);
    assert.throws(() => normalizeNodePayload(baseNode('Trojan', { uuid: 'credential', private_key: 'secret', traffic_limit: -1 })), /traffic limit/i);
});

test('listener conflicts are scoped by VPS transport', () => {
    const { nodeListenerConflicts } = __test;
    const existing = [{ id: 'old', protocol: 'Trojan', port: 443 }];
    assert.equal(nodeListenerConflicts(existing, { id: 'new', protocol: 'XTLS-Reality', port: 443 }), true);
    assert.equal(nodeListenerConflicts(existing, { id: 'new', protocol: 'Hysteria2', port: 443 }), false);
    assert.equal(nodeListenerConflicts(existing, { id: 'old', protocol: 'Trojan', port: 443 }), false);
});

test('the UI only offers enabled internal relay targets on the same VPS', () => {
    assert.match(serversPage, /n\.vps_ip === vps\.ip && n\.enable/);
    assert.match(serversPage, /选择本 VPS 的目标节点/);
    assert.match(frontend, /startPort \+ 8 > 65535/);
    assert.match(frontend, /sni: 'addons\.mozilla\.org'/);
    assert.match(serversPage, /最近节点配置已在 VPS 生效/);
    assert.match(serversPage, /最近节点配置应用失败/);
});

test('node forms stay compact and mark required fields explicitly', () => {
    const requiredLabels = serversPage.match(/<b class="kui-required">\*<\/b>/g) || [];
    assert.ok(requiredLabels.length >= 10);
    assert.match(serversPage, /归属用户 <b class="kui-required">\*<\/b>/);
    assert.match(serversPage, /端口 <b class="kui-required">\*<\/b>/);
    assert.match(serversPage, /Reality 伪装域名 <b class="kui-required">\*<\/b>/);
    assert.match(serversPage, /目标节点 <b class="kui-required">\*<\/b>/);
    assert.match(serversPage, /class="kui-node-form-grid kui-node-form-primary"/);
    assert.match(appStyles, /min-height: 36px !important/);
    assert.match(appStyles, /min-height: 44px !important/);
});

test('integrated Worker notifies the connected VPS agent directly', async () => {
    const requests = [];
    const db = { prepare: () => ({ bind: () => ({ first: async () => ({ agent_token: 'agent-secret' }) }) }) };
    const env = { VPS_PRESENCE: {
        idFromName: name => name,
        get: name => ({ fetch: async request => { requests.push({ name, request }); return Response.json({ success: true }); } }),
    } };
    await __test.notifyRealtimeVps(env, db, '203.0.113.8');
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0].request.url).pathname, '/notify');
    assert.match(requests[0].name, /^v2:203\.0\.113\.8:[0-9a-f]{64}$/);
});
