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

test('uninstaller removes KUI Agent and sing-box but preserves proxy-lite', () => {
    assert.match(script, /rm -rf \/opt\/kui/);
    assert.match(script, /rm -f \/usr\/bin\/sing-box/);
    assert.match(script, /REMOVE_SYSTEMD_SINGBOX_UNIT/);
    assert.doesNotMatch(script, /rm\s+-rf\s+\/opt\/proxy_lite/);
    assert.doesNotMatch(script, /(?:disable|stop|del)[^\n]*proxy-lite/);
});

test('Worker exposes the authenticated uninstaller asset', () => {
    assert.match(api, /uninstaller:\s*'\/vps\/uninstall-agent\.sh'/);
});
