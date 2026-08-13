import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const script = fs.readFileSync(new URL('../static/vps/uninstall-agent.sh', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');

test('uninstaller requires explicit confirmation and creates a root-only backup', () => {
    assert.match(script, /--yes\) CONFIRMED=1/);
    assert.match(script, /--ip\).*EXPECTED_IP/);
    assert.match(script, /ACTUAL_IP=.*\/opt\/kui\/config\.json/);
    assert.match(script, /VPS 身份校验失败/);
    assert.match(script, /kui-agent-backup-/);
    assert.match(script, /chmod 600 "\$BACKUP_PATH"/);
});

test('default uninstaller removes KUI Agent and sing-box but preserves proxy-lite', () => {
    assert.match(script, /rm -rf \/opt\/kui/);
    assert.match(script, /rm -f \/usr\/bin\/sing-box/);
    assert.match(script, /REMOVE_SYSTEMD_SINGBOX_UNIT/);
    assert.match(script, /if \[ "\$PURGE_ALL" -eq 1 \]; then[\s\S]*?rm -rf \/opt\/proxy_lite/);
    assert.match(script, /if \[ "\$PURGE_ALL" -eq 1 \]; then systemctl disable --now proxy-lite\.service/);
});

test('Worker exposes the authenticated uninstaller asset', () => {
    assert.match(api, /uninstaller:\s*'\/vps\/uninstall-agent\.sh'/);
});

test('full purge removes all components and reports panel cleanup', () => {
    assert.match(script, /--all\) PURGE_ALL=1/);
    assert.match(script, /--api\).*API_URL/);
    assert.match(script, /--bootstrap\).*BOOTSTRAP/);
    assert.match(script, /\$API_URL\/api\/vps_purge/);
    assert.match(script, /KUI Agent、KUI sing-box、proxy-lite、OpenVPN/);
    assert.match(api, /action === "vps_purge" && method === "POST"/);
    assert.match(api, /deleteVpsRecords\(db, ip\)/);
    const purgeIndex = api.indexOf('action === "vps_purge" && method === "POST"');
    const authIndex = api.indexOf('const currentUser = await verifyAuth', purgeIndex);
    assert.ok(purgeIndex >= 0 && authIndex > purgeIndex, 'purge route must precede admin session auth');
});
