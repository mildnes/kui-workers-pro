import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { __test } from '../functions/api/[[path]].js';

const manager = fs.readFileSync(new URL('../static/vps/lite_manager.py', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const { sanitizeProxyListenHost } = __test;

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
