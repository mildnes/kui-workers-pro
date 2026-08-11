import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const appShell = read('../frontend/src/app/AppShell.vue');
const desktopNavigation = read('../frontend/src/app/DesktopNavigation.vue');
const mobileNavigation = read('../frontend/src/app/MobileNavigation.vue');
const serversPage = read('../frontend/src/pages/ServersPage.vue');
const appStyles = read('../frontend/src/styles/app.css');
const topBar = read('../frontend/src/app/TopBar.vue');

test('removed and hidden pages are absent from the active UI', () => {
    assert.doesNotMatch(appShell, /ServicesPage|RealmPage/);
    assert.doesNotMatch(desktopNavigation, /第三方服务|Realm 中转|id:\s*['"](?:services|realm)['"]/);
    assert.doesNotMatch(mobileNavigation, /第三方服务|Realm|id:\s*['"](?:services|realm)['"]/);
    assert.doesNotMatch(topBar, /第三方服务|Realm 中转/);
});

test('desktop navigation keeps residential proxy below servers and settings above the user footer', () => {
    const nodes = desktopNavigation.indexOf("id: 'nodes'");
    const proxy = desktopNavigation.indexOf("id: 'proxy'");
    const users = desktopNavigation.indexOf("id: 'users'");
    assert.ok(nodes >= 0 && nodes < proxy && proxy < users);
    assert.ok(desktopNavigation.indexOf('kui-sidebar-secondary') < desktopNavigation.indexOf('kui-sidebar-footer'));
    assert.match(desktopNavigation, /kui-sidebar-secondary[\s\S]*go\('settings'\)/);
});

test('probe monitor is displayed before subscription exports and remains visible on mobile', () => {
    const probe = topBar.indexOf('探针监控');
    const exports = topBar.indexOf('订阅与导出');
    assert.ok(probe >= 0 && probe < exports);
    assert.doesNotMatch(topBar.match(/<button @click="openProbe"[^>]+>/)?.[0] || '', /kui-desktop-only/);
    assert.match(topBar, /openProbe[\s\S]*activeTab\.value = 'probe'/);
});

test('mobile admin navigation places residential proxy before users and removes duplicate probe entry', () => {
    const nodes = mobileNavigation.indexOf("id: 'nodes'");
    const proxy = mobileNavigation.indexOf("id: 'proxy'");
    const users = mobileNavigation.indexOf("id: 'users'");
    const moreItems = mobileNavigation.slice(mobileNavigation.indexOf('const moreItems'), mobileNavigation.indexOf('const userItems'));
    assert.ok(nodes >= 0 && nodes < proxy && proxy < users);
    assert.doesNotMatch(moreItems, /id:\s*['"]probe['"]/);
});

test('servers page uses compact Chinese overview and a clearly bordered VPS form', () => {
    assert.doesNotMatch(topBar, /kui-page-subtitle|siteTitle \|\| 'Cluster Gateway'/);
    for (const label of ['在线服务器', '累计流量', '实时下载', '实时上传']) assert.match(serversPage, new RegExp(label));
    assert.doesNotMatch(serversPage, /ONLINE SERVERS|AGGREGATE TRAFFIC|>DOWNLOAD<|>UPLOAD</);
    assert.match(serversPage, /接入 VPS<\/span><small>添加服务器别名、公网 IP 与系统架构/);
    assert.match(appStyles, /\.kui-add-server > summary \{ justify-content: flex-start; \}/);
    assert.match(appStyles, /\.kui-add-server-form input, \.kui-add-server-form select \{ border: 1px solid #cbd5e1/);
    assert.match(appStyles, /\.kui-servers-page[\s\S]*margin-top: 10px/);
});

test('server cards expose clear visual boundaries between operational modules', () => {
    for (const className of ['kui-server-card', 'kui-server-metric', 'kui-server-chart', 'kui-quick-deploy-panel', 'kui-node-deploy-panel', 'kui-egress-panel', 'kui-node-list-section', 'kui-node-card', 'kui-server-delivery-section', 'kui-deploy-panel']) {
        assert.match(serversPage, new RegExp(className));
        assert.match(appStyles, new RegExp(`\\.${className}`));
    }
    assert.match(appStyles, /\.kui-server-card > \* \+ \* \{ border-top-color: #d7dfeb/);
});

test('server card header and deployment actions use the compact explicit layout', () => {
    const status = serversPage.indexOf('kui-server-status-dot');
    const ip = serversPage.indexOf('kui-server-ip');
    assert.ok(status >= 0 && status < ip);
    assert.doesNotMatch(serversPage, /UP:|LOAD:|vps\.uptime|vps\.load/);
    assert.match(serversPage, /<button @click="copyCommand\(generateCmd\(vps\.ip\)[\s\S]{0,180}kui-copy-deploy-button[\s\S]{0,80}复制完整部署命令<\/button>/);
    assert.match(appStyles, /\.kui-copy-deploy-button \{ display: flex; width: 100%;/);
    assert.match(serversPage, /class="kui-server-name truncate">\{\{ vps\.name \}\}/);
    assert.match(appStyles, /\.kui-server-name \{ font-size: 28px;/);
});

test('server subscription exports live in the overflow menu', () => {
    const menu = serversPage.slice(serversPage.indexOf('kui-server-menu'), serversPage.indexOf('kui-server-metric'));
    assert.match(menu, /generateSubLink\(vps\.ip, ''\)/);
    assert.match(menu, /generateSubLink\(vps\.ip, 'clash'\)/);
    assert.match(menu, /copySurgeConfig\(vps\.ip\)/);
    assert.match(appStyles, /\.kui-server-menu-panel/);
});

test('deployment command frame is collapsed by default and contains all three actions', () => {
    const start = serversPage.indexOf('<details class="kui-deploy-panel');
    const deployPanel = serversPage.slice(start, serversPage.indexOf('</details>', start));
    assert.ok(start >= 0);
    assert.doesNotMatch(deployPanel.match(/<details[^>]*>/)?.[0] || '', /\sopen(?:\s|>)/);
    assert.equal((deployPanel.match(/<button\b/g) || []).length, 3);
    assert.match(deployPanel, /copyCommand\(generateCmd\(vps\.ip\)/);
    assert.match(deployPanel, /copyUninstallCommand\(vps\)/);
    assert.match(deployPanel, /copyPurgeCommand\(vps\)/);
    assert.match(appStyles, /\.kui-deploy-panel-body \{ padding:/);
});
