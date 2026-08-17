import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const installer = fs.readFileSync(new URL('../static/vps/kui.sh', import.meta.url), 'utf8');

test('sing-box installer accepts private HTTPS mirrors and GitHub proxy prefixes', () => {
    assert.match(installer, /SING_BOX_URL="\$\{KUI_SING_BOX_URL:-\}"/);
    assert.match(installer, /GITHUB_PROXY="\$\{KUI_GITHUB_PROXY:-\}"/);
    assert.match(installer, /--sing-box-url\).*SING_BOX_URL="\$2"/);
    assert.match(installer, /--github-proxy\).*GITHUB_PROXY="\$2"/);
    assert.match(installer, /--sing-box-url 必须使用 https:\/\//);
    assert.match(installer, /--github-proxy 必须使用 https:\/\//);
});

test('sing-box sources are tried in explicit mirror, proxy, official order', () => {
    const custom = installer.indexOf('download_sing_box "$SING_BOX_URL"');
    const proxy = installer.indexOf('download_sing_box "${GITHUB_PROXY%/}/${SB_OFFICIAL_URL}"');
    const official = installer.indexOf('download_sing_box "$SB_OFFICIAL_URL"');
    assert.ok(custom > 0, 'custom sing-box URL should be attempted');
    assert.ok(proxy > custom, 'GitHub proxy should follow the custom URL');
    assert.ok(official > proxy, 'official GitHub should be the final source');
    assert.match(installer, /\[ "\$ACTUAL_SHA" = "\$EXPECTED_SHA" \]/);
});

test('sing-box install reuses an exact version and atomically replaces other versions', () => {
    assert.match(installer, /CURRENT_SB_VER=.*sing-box version/);
    assert.match(installer, /\[ "\$CURRENT_SB_VER" = "\$SB_VER" \]/);
    assert.doesNotMatch(installer, /部署 Sing-box 代理核心[\s\S]{0,100}\nrm -f \/usr\/bin\/sing-box/);
    assert.match(installer, /SB_STAGED_PATH="\/usr\/bin\/\.sing-box\.kui\.\$\$"/);
    assert.match(installer, /mv "\$SB_STAGED_PATH" \/usr\/bin\/sing-box/);
});
