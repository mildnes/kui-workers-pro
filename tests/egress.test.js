import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { __test } from '../functions/api/[[path]].js';

const api = fs.readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const agent = fs.readFileSync(new URL('../static/vps/agent.py', import.meta.url), 'utf8');
const realtime = fs.readFileSync(new URL('../realtime/src/index.js', import.meta.url), 'utf8');
const frontend = fs.readFileSync(new URL('../frontend/src/composables/useKuiState.js', import.meta.url), 'utf8');

test('egress requests normalize selective categories and validate SOCKS5 endpoints', () => {
    const { normalizeEgressRequest } = __test;
    assert.equal(typeof normalizeEgressRequest, 'function');
    const normalized = normalizeEgressRequest({
        egress_mode: 'socks5',
        proxy_mode: 'selective',
        proxy_categories: 'AI,youtube,ai',
        socks5_addr: 'proxy.example.com',
        socks5_port: 1080,
        socks5_user: 'alice',
        socks5_pass: 'new-secret',
    });
    assert.equal(normalized.proxyCategories, 'youtube,ai');
    assert.deepEqual(normalized.desiredConfig, {
        mode: 'socks5',
        proxy_mode: 'selective',
        proxy_categories: 'youtube,ai',
        socks5: { addr: 'proxy.example.com', port: 1080, user: 'alice', pass: 'new-secret' },
    });
    assert.throws(() => normalizeEgressRequest({ egress_mode: 'socks5', socks5_addr: 'https://proxy.example.com', socks5_port: 1080 }), /address/i);
    assert.throws(() => normalizeEgressRequest({ egress_mode: 'socks5', socks5_addr: 'proxy.example.com', socks5_port: 0 }), /port/i);
    assert.throws(() => normalizeEgressRequest({ egress_mode: 'residential', proxy_mode: 'selective', proxy_categories: 'unknown' }), /categor/i);
    assert.throws(() => normalizeEgressRequest({ egress_mode: 'residential', proxy_mode: 'selective', proxy_categories: '' }), /categor/i);
});

test('SOCKS5 password is write-only and an empty field preserves the stored value', () => {
    const { normalizeEgressRequest } = __test;
    const current = { socks5_pass: 'stored-secret' };
    const kept = normalizeEgressRequest({ egress_mode: 'socks5', socks5_addr: '127.0.0.1', socks5_port: 1080, socks5_pass: '' }, current);
    assert.equal(kept.desiredConfig.socks5.pass, 'stored-secret');
    const cleared = normalizeEgressRequest({ egress_mode: 'socks5', socks5_addr: '127.0.0.1', socks5_port: 1080, socks5_clear_password: true }, current);
    assert.equal(cleared.desiredConfig.socks5.pass, '');
    assert.equal(cleared.desiredConfig.socks5.user, '');
    const adminDataRoute = api.slice(api.indexOf('if (action === "data")'), api.indexOf('if (action === "settings"'));
    assert.doesNotMatch(adminDataRoute, /SELECT \* FROM servers/);
    assert.match(adminDataRoute, /socks5_password_set/);
    assert.doesNotMatch(frontend, /s\.socks5_pass\b|vps\.socks5_pass\s*=/);
});

test('manual SOCKS5 selection stays as a local draft until complete settings are submitted', () => {
    assert.match(frontend, /vps\._egress_mode_draft = 'socks5';\s*return;/);
    assert.match(frontend, /const egressModeOf = vps => vps\._egress_mode_draft \|\| vps\.egress_mode/);
    assert.match(frontend, /const body = \{ ip: vps\.ip, egress_mode: targetMode \}/);
    assert.match(frontend, /const draftFields = \['\_egress_mode_draft'/);
    assert.match(frontend, /s\._socks5_addr === undefined/);
    assert.match(frontend, /mode !== 'socks5'/);
    assert.match(frontend, /prevDraftMode \|\| \(targetMode === 'socks5' \? 'socks5' : ''\)/);
});

test('desired and applied egress snapshots are persisted independently', () => {
    assert.match(api, /egress_desired_config/);
    assert.match(api, /egress_applied_config/);
    assert.match(api, /egress_applied_config = egress_desired_config/);
    assert.match(realtime, /egress_applied_config = egress_desired_config/);
    assert.match(agent, /applied_config/);
    assert.match(agent, /rollback_config/);
    assert.match(agent, /rollback_healthy = _restore_last_good_singbox\(\)/);
    assert.match(agent, /previous_config_restored=/);
    assert.doesNotMatch(agent, /rollback_socks = \{[^}]*egress\.get\("socks5_addr"/s);
});

test('all egress modes report the IP verified during application', () => {
    assert.match(agent, /verified_egress_ip\s*=\s*build_singbox_config/);
    assert.match(agent, /verified_egress_ip = _verify_socks5_exit\(egress_check_host\)/);
    assert.match(agent, /verified_egress_ip = _verify_native_exit\(\)/);
    assert.match(agent, /"egress_ip": verified_egress_ip/);
});

test('WARP preparation is asynchronous and endpoint recovery keeps the identity profile', () => {
    assert.match(agent, /def _prepare_warp_profile_async/);
    assert.match(agent, /threading\.Thread\([^\n]+warp-profile/);
    assert.match(agent, /def _refresh_warp_endpoint/);
    assert.match(agent, /peer_host/);
    assert.doesNotMatch(agent, /os\.remove\(WARP_CONF_PATH\)/);
});

test('legacy egress columns and WARP-only state names are no longer active', () => {
    for (const column of ['egress_pending', 'socks5_mode', 'socks5_domains', 'warp_revision', 'warp_status', 'warp_error']) {
        assert.doesNotMatch(api, new RegExp(`\\['servers', '${column}'`));
    }
    assert.doesNotMatch(agent, /def _load_warp_state|def _save_warp_state/);
    assert.match(agent, /def _load_egress_state|def _save_egress_state/);
});
