import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manager = fs.readFileSync(new URL('../static/vps/lite_manager.py', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');

test('proxy-lite reports the active tunnel exit IP', () => {
    assert.match(manager, /"node_ip": tun\.egress_ip if tun\.egress_ip else tun\.entry_ip,\s*"exit_ip": tun\.egress_ip if tun\.egress_ip else tun\.entry_ip/);
});

test('Worker accepts legacy residential reports using node_ip as exit fallback', () => {
    assert.match(api, /item\.exit_ip \|\| item\.node_ip/);
    assert.match(api, /const activeExitIp = active\?\.exit_ip \|\| active\?\.node_ip \|\| ''/);
});
