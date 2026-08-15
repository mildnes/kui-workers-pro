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
        buildSurgeProxyLine({ name: 'SG, Node', protocol: 'Shadowsocks2022', host: '203.0.113.8', port: 443, method: '2022-blake3-aes-256-gcm', password, network: 'tcp,udp' }),
        `SG- Node = ss, 203.0.113.8, 443, encrypt-method=2022-blake3-aes-256-gcm, password="${password}", tfo=true, ip-version=v4-only, udp-relay=true, block-quic=on`,
    );
    assert.match(
        buildSurgeProxyLine({ name: 'SS TCP', protocol: 'Shadowsocks2022', host: '203.0.113.8', port: 443, method: '2022-blake3-aes-128-gcm', password: Buffer.alloc(16, 4).toString('base64'), network: 'tcp' }),
        /udp-relay=false/,
    );
    assert.match(
        buildSurgeProxyLine({ name: 'SS IPv6', protocol: 'Shadowsocks2022', host: '[2001:db8::1]', port: 443, method: '2022-blake3-aes-128-gcm', password: Buffer.alloc(16, 5).toString('base64') }),
        /ip-version=v6-only/,
    );
});

test('renders Surge native protocols and skips unsupported protocols', () => {
    assert.equal(
        buildSurgeProxyLine({ name: 'TUIC', protocol: 'TUIC', host: 'example.com', port: 56789, uuid: '00000000-0000-4000-8000-000000000000', password: 'secret' }),
        'TUIC = tuic-v5, example.com, 56789, password="secret", uuid=00000000-0000-4000-8000-000000000000, alpn=h3, ip-version=v4-only, block-quic=off, ecn=auto, skip-cert-verify=true',
    );
    assert.equal(buildSurgeProxyLine({ name: 'TUIC', protocol: 'TUIC', host: 'example.com', port: 56789, uuid: 'invalid', password: 'secret' }), '');
    assert.equal(
        buildSurgeProxyLine({ name: 'SOCKS', protocol: 'Socks5', host: '203.0.113.9', port: 1080, uuid: 'user', password: 'p@ss' }),
        'SOCKS = socks5, 203.0.113.9, 1080, username="user", password="p@ss", udp-relay=true',
    );
    assert.equal(buildSurgeProxyLine({ name: 'Reality', protocol: 'XTLS-Reality', host: 'example.com', port: 443 }), '');
});
