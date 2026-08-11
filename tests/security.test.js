import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const api = fs.readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../static/index.html', import.meta.url), 'utf8');
const readme = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const wrangler = fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const realtime = fs.readFileSync(new URL('../realtime/src/index.js', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');

test('deployment config does not contain default credentials', () => {
    assert.doesNotMatch(wrangler, /"ADMIN_PASSWORD"\s*:\s*"admin"/);
    assert.doesNotMatch(wrangler, /"PROXY_USER"\s*:\s*"kui"/);
    assert.doesNotMatch(wrangler, /"PROXY_PASS"\s*:\s*"kui"/);
});

test('deployments preserve dashboard variables and document secret types', () => {
    assert.match(wrangler, /"keep_vars"\s*:\s*true/);
    assert.match(readme, /`ADMIN_PASSWORD`\s*\|\s*Secret/);
    assert.match(readme, /`PROXY_USER`\s*\/\s*`PROXY_PASS`\s*\|\s*Secret/);
});

test('proxy list opens as text instead of document-written markup', () => {
    assert.doesNotMatch(html, /document\.write\('<pre>'\+t\+'<\/pre>'\)/);
    assert.match(html, /pre\.textContent\s*=\s*t/);
});

test('login throttling does not use the Authorization request header', () => {
    const throttle = api.match(/function loginThrottleKey\(request\) \{([^}]+)\}/)?.[1] || '';
    assert.doesNotMatch(throttle, /Authorization/);
    assert.match(throttle, /CF-Connecting-IP/);
});

test('login uses a minimal batched auth schema and exposes request progress', () => {
    const loginStart = api.indexOf('if (action === "login"');
    const loginEnd = api.indexOf('if (action === "logout"', loginStart);
    const loginRoute = api.slice(loginStart, loginEnd);
    assert.match(api, /async function ensureAuthSchema\(db\)[\s\S]*db\.batch\(\[/);
    assert.match(loginRoute, /await ensureAuthSchema\(db\)/);
    assert.doesNotMatch(loginRoute, /ensureDbSchema/);
    assert.match(html, /:disabled="loginPending"/);
    assert.match(html, /AbortSignal\.timeout\(15000\)/);
    assert.match(html, /finally[\s\S]{0,100}loginPending\.value = false/);
});

test('private probe authorization is checked before the public cache', () => {
    const routeStart = api.indexOf("if (method === 'GET' && subPath === 'public')");
    const routeEnd = api.indexOf("if (method === 'GET' && subPath === 'detail')", routeStart);
    const route = api.slice(routeStart, routeEnd);
    assert.ok(route.indexOf('isPublic') < route.indexOf('caches.default.match'));
    assert.match(api, /invalidatePublicProbeCache/);
});

test('proxy config is loaded for a selected VPS and batch results are explicit', () => {
    assert.match(html, /\/api\/proxy\/config\?ip=\$\{encodeURIComponent\(targetIp\)\}/);
    assert.match(html, /Promise\.allSettled/);
    assert.match(html, /成功.*失败/s);
});

test('residential proxy target options show VPS aliases with IPs', () => {
    assert.match(html, /window\.kuiManagedServers\s*=\s*\(\)\s*=>/);
    assert.match(html, /pcEscapeHtml\(server\.name \|\| server\.ip\)[\s\S]{0,80}\s:\s[\s\S]{0,80}pcEscapeHtml\(server\.ip\)/);
});

test('manual refresh propagates data loading failures', () => {
    assert.match(html, /await refreshData\(true\)/);
    assert.match(html, /await fetchProbeData\(false, true\)/);
});

test('schema initialization does not silently accept failed migrations', () => {
    assert.doesNotMatch(api, /for \(let query of (?:initQueries|probeQueries|tpsQueries)\) \{ try/);
    assert.match(api, /PRAGMA table_info/);
    assert.match(api, /schemaColumns = new Map\(\)/);
    assert.match(api, /chunkBatch\(db, initQueries\.map/);
});

test('API data never returns password hashes and logout revokes sessions', () => {
    assert.doesNotMatch(api, /SELECT \* FROM users/);
    assert.match(api, /action === "logout"/);
    assert.match(api, /DELETE FROM auth_sessions WHERE token_hash/);
});

test('browser sessions are not persisted in localStorage', () => {
    assert.doesNotMatch(html, /localStorage\.(?:getItem|setItem)\('kui_auth_key'/);
    assert.match(html, /sessionStorage\.setItem\('kui_auth_key'/);
});

test('external Worker fetches use bounded timeouts', () => {
    assert.match(api, /testisp\.info[\s\S]{0,300}AbortSignal\.timeout/);
    assert.match(api, /frequency-policy[\s\S]{0,400}AbortSignal\.timeout/);
});

test('proxy diagnostics follow the selected VPS', () => {
    assert.match(html, /const selectedServer =/);
    assert.match(html, /selectedServer\.logs/);
});

test('realtime patches invalidate the snapshot cache', () => {
    const routeStart = realtime.indexOf('url.pathname === "/update"');
    const updateRoute = realtime.slice(routeStart, realtime.indexOf('url.pathname === "/snapshot"', routeStart));
    assert.match(updateRoute, /this\.snapshotCache = null/);
    assert.match(updateRoute, /this\.snapshotCachedAt = 0/);
});

test('executable CDN resources are versioned and integrity pinned', () => {
    for (const match of html.matchAll(/<script src="https:[^>]+>/g)) {
        assert.match(match[0], /integrity="sha384-/);
        assert.match(match[0], /crossorigin="anonymous"/);
    }
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com"/);
});

test('static responses include baseline browser security headers', () => {
    assert.match(worker, /Content-Security-Policy/);
    assert.match(worker, /X-Content-Type-Options/);
    assert.match(worker, /X-Frame-Options/);
    assert.match(wrangler, /"run_worker_first"\s*:\s*true/);
});
