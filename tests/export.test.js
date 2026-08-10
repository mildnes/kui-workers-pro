import assert from 'node:assert/strict';
import test from 'node:test';

import { __test } from '../functions/api/[[path]].js';

const { buildSurgeProxyLine, validateSs2022Credentials } = __test;

test('accepts correctly sized Shadowsocks 2022 keys', () => {
    assert.doesNotThrow(() => validateSs2022Credentials('2022-blake3-aes-128-gcm', Buffer.alloc(16, 1).toString('base64')));
    assert.doesNotThrow(() => validateSs2022Credentials('2022-blake3-aes-256-gcm', Buffer.alloc(32, 2).toString('base64')));
});

test('rejects invalid Shadowsocks 2022 methods and key lengths', () => {
    assert.throws(() => validateSs2022Credentials('aes-256-gcm', Buffer.alloc(32).toString('base64')), /method/);
    assert.throws(() => validateSs2022Credentials('2022-blake3-aes-256-gcm', Buffer.alloc(16).toString('base64')), /32 bytes/);
    assert.throws(() => validateSs2022Credentials('2022-blake3-aes-128-gcm', 'not-base64'), /key/);
});

test('renders a Surge Shadowsocks 2022 configuration line', () => {
    const password = Buffer.alloc(32, 3).toString('base64');
    assert.equal(
        buildSurgeProxyLine({ name: 'SG, Node', protocol: 'Shadowsocks2022', host: '203.0.113.8', port: 443, method: '2022-blake3-aes-256-gcm', password }),
        `SG- Node = ss, 203.0.113.8, 443, encrypt-method=2022-blake3-aes-256-gcm, password="${password}"`,
    );
});

test('renders Surge native protocols and skips unsupported protocols', () => {
    assert.match(buildSurgeProxyLine({ name: 'TUIC', protocol: 'TUIC', host: 'example.com', port: 443, uuid: '00000000-0000-4000-8000-000000000000', password: 'secret', sni: 'example.com' }), /^TUIC = tuic-v5,/);
    assert.equal(buildSurgeProxyLine({ name: 'Reality', protocol: 'XTLS-Reality', host: 'example.com', port: 443 }), '');
});
