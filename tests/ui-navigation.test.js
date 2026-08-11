import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const appShell = read('../frontend/src/app/AppShell.vue');
const desktopNavigation = read('../frontend/src/app/DesktopNavigation.vue');
const mobileNavigation = read('../frontend/src/app/MobileNavigation.vue');
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
