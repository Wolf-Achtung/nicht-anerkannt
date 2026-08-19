const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const PORT = 4567;
let server;

function request(method, path, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {})
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

before(async () => {
  process.env.PORT = String(PORT);
  // No API key → all AI endpoints will use local fallbacks
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.CLAUDE_API_KEY;
  delete process.env.AI_API_KEY;
  server = require('../server.js');
  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 500));
});

after(() => {
  if (server && server.close) server.close();
});

describe('Language routing', () => {
  it('redirects / to the default language home (DE without Accept-Language)', async () => {
    const res = await request('GET', '/');
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.location, '/de/');
  });

  it('honours Accept-Language when redirecting /', async () => {
    const res = await request('GET', '/', null, { 'Accept-Language': 'en-GB,en;q=0.9' });
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.location, '/en/');
  });

  it('honours atelier-lang cookie over Accept-Language', async () => {
    const res = await request('GET', '/', null, {
      'Accept-Language': 'de-DE',
      Cookie: 'atelier-lang=en'
    });
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.location, '/en/');
  });

  it('serves DE index.html at /de/', async () => {
    const res = await request('GET', '/de/');
    assert.strictEqual(res.status, 200);
    assert.ok(res.raw.includes('<!doctype html'), 'should contain HTML doctype');
    assert.ok(res.raw.toLowerCase().includes('lang="de"'), 'should have lang="de"');
  });

  it('serves EN index.html at /en/', async () => {
    const res = await request('GET', '/en/');
    assert.strictEqual(res.status, 200);
    assert.ok(res.raw.toLowerCase().includes('lang="en"'), 'should have lang="en"');
  });

  it('serves DE subpage at /de/werkstatt', async () => {
    const res = await request('GET', '/de/werkstatt');
    assert.strictEqual(res.status, 200);
    assert.ok(res.raw.toLowerCase().includes('lang="de"'));
  });

  it('serves EN subpage at /en/werkstatt', async () => {
    const res = await request('GET', '/en/werkstatt');
    assert.strictEqual(res.status, 200);
    assert.ok(res.raw.toLowerCase().includes('lang="en"'));
  });

  it('falls through to 302 for unknown subpage /de/does-not-exist', async () => {
    const res = await request('GET', '/de/does-not-exist');
    assert.strictEqual(res.status, 302);
  });

  it('redirects legacy /pages/werkstatt.html to /de/werkstatt (301)', async () => {
    const res = await request('GET', '/pages/werkstatt.html');
    assert.strictEqual(res.status, 301);
    assert.strictEqual(res.headers.location, '/de/werkstatt');
  });

  it('redirects legacy /en/pages/werkstatt.html to /en/werkstatt (301)', async () => {
    const res = await request('GET', '/en/pages/werkstatt.html');
    assert.strictEqual(res.status, 301);
    assert.strictEqual(res.headers.location, '/en/werkstatt');
  });

  it('redirects legacy /index.html to /de/ (301)', async () => {
    const res = await request('GET', '/index.html');
    assert.strictEqual(res.status, 301);
    assert.strictEqual(res.headers.location, '/de/');
  });

  it('redirects legacy /en/index.html to /en/ (301)', async () => {
    const res = await request('GET', '/en/index.html');
    assert.strictEqual(res.status, 301);
    assert.strictEqual(res.headers.location, '/en/');
  });

  it('has security headers (helmet)', async () => {
    const res = await request('GET', '/de/');
    assert.ok(res.headers['x-content-type-options'], 'should have X-Content-Type-Options');
    assert.ok(res.headers['x-frame-options'] || res.headers['content-security-policy'],
      'should have frame protection');
  });
});

describe('GET /api/health', () => {
  it('reports service state without exposing the key', async () => {
    const res = await request('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    // Suite runs without a key configured
    assert.strictEqual(res.body.apiKeyConfigured, false);
    assert.strictEqual(typeof res.body.model, 'string');
    assert.ok(res.body.model.length > 0, 'model should be reported');
    assert.strictEqual(typeof res.body.uptimeSeconds, 'number');
    // Answers "which runtime and which thinking mode actually run" without
    // needing access to the deploy platform's settings.
    assert.match(res.body.node, /^v\d+\./, 'should report the running Node version');
    assert.strictEqual(res.body.thinking, 'disabled');
    assert.strictEqual(res.body.effort, null, 'effort only applies when thinking is on');
    assert.ok(!res.raw.includes('sk-'), 'must never leak a key');
  });
});

describe('CORS', () => {
  it('does not set Access-Control-Allow-Origin for unknown origins', async () => {
    const res = await request('POST', '/api/chat', { message: 'test' });
    assert.strictEqual(res.headers['access-control-allow-origin'], undefined,
      'should not include wildcard CORS');
  });
});

describe('POST /api/chat', () => {
  it('returns 400 without message', async () => {
    const res = await request('POST', '/api/chat', {});
    assert.strictEqual(res.status, 400);
  });

  it('returns 400 for non-string message', async () => {
    const res = await request('POST', '/api/chat', { message: 123 });
    assert.strictEqual(res.status, 400);
  });

  it('returns 500 when no API key is configured', async () => {
    const res = await request('POST', '/api/chat', { message: 'Hallo' });
    assert.strictEqual(res.status, 500);
    assert.ok(res.body.reply, 'should have reply field');
  });
});

describe('POST /api/daily', () => {
  it('returns local fallback without API key', async () => {
    const res = await request('POST', '/api/daily', { seed: '2026-04-06' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.titel, 'should have titel');
    assert.ok(res.body.impuls, 'should have impuls');
    assert.ok(res.body.frage, 'should have frage');
    assert.ok(['local-pool', 'emergency-fallback'].includes(res.body.source),
      'should use local source');
  });
});

describe('POST /api/widerspruch', () => {
  it('returns 400 without these', async () => {
    const res = await request('POST', '/api/widerspruch', {});
    assert.strictEqual(res.status, 400);
  });

  it('returns 400 for non-string these', async () => {
    const res = await request('POST', '/api/widerspruch', { these: ['array'] });
    assert.strictEqual(res.status, 400);
  });
});

describe('POST /api/stresstest', () => {
  it('returns 400 without text', async () => {
    const res = await request('POST', '/api/stresstest', {});
    assert.strictEqual(res.status, 400);
  });

  it('returns 400 for text > 5000 chars', async () => {
    const res = await request('POST', '/api/stresstest', { text: 'x'.repeat(5001) });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('5000'), 'should mention limit');
  });
});

describe('POST /api/gegenrede', () => {
  it('returns 400 for text > 8000 chars', async () => {
    const res = await request('POST', '/api/gegenrede', { text: 'x'.repeat(8001) });
    assert.strictEqual(res.status, 400);
  });
});

describe('POST /api/urteil', () => {
  it('returns 400 for unknown action', async () => {
    const res = await request('POST', '/api/urteil', { action: 'unknown' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('Unbekannte Aktion'));
  });
});

describe('POST /api/client-log', () => {
  it('accepts valid log messages', async () => {
    const res = await request('POST', '/api/client-log', {
      level: 'warn',
      context: 'test',
      message: 'Test log message'
    });
    assert.strictEqual(res.status, 202);
    assert.ok(res.body.ok);
  });

  it('returns 400 without message', async () => {
    const res = await request('POST', '/api/client-log', { level: 'error' });
    assert.strictEqual(res.status, 400);
  });
});

// The daily challenge is the same for everyone on a given day, so it must be
// generated once and reused. Without this, every visitor triggered a fresh AI
// call — the project's largest avoidable cost. This test spawns a real server
// against a counting stub because the suite above runs without an API key and
// therefore never reaches the caching path.
describe('GET/POST /api/daily — one AI call per day and language', () => {
  const { spawn } = require('child_process');
  const path = require('path');
  let stub, child, stubCalls = 0, stubPort, appPort;

  function post(port, body) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = http.request(
        { hostname: '127.0.0.1', port, path: '/api/daily', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
        (res) => { let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => resolve(JSON.parse(b))); }
      );
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  function waitForReady(port, tries = 60) {
    return new Promise((resolve, reject) => {
      const attempt = (left) => {
        const req = http.get({ hostname: '127.0.0.1', port, path: '/api/health' }, (res) => {
          res.resume();
          res.statusCode === 200 ? resolve() : retry(left);
        });
        req.on('error', () => retry(left));
      };
      const retry = (left) => {
        if (left <= 0) return reject(new Error('server did not start'));
        setTimeout(() => attempt(left - 1), 100);
      };
      attempt(tries);
    });
  }

  before(async () => {
    stub = http.createServer((req, res) => {
      stubCalls++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify({ titel: 'T' + stubCalls, impuls: 'I', frage: 'F' + stubCalls }) }],
        stop_reason: 'end_turn'
      }));
    });
    await new Promise((r) => stub.listen(0, '127.0.0.1', r));
    stubPort = stub.address().port;
    appPort = stubPort + 1;

    child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
      env: Object.assign({}, process.env, {
        PORT: String(appPort),
        ANTHROPIC_API_KEY: 'test-key',
        ANTHROPIC_BASE_URL: 'http://127.0.0.1:' + stubPort
      }),
      stdio: 'ignore'
    });
    await waitForReady(appPort);
  });

  after(() => {
    if (child) child.kill();
    if (stub) stub.close();
  });

  it('serves repeat visitors from memory instead of calling the AI again', async () => {
    const first = await post(appPort, { lang: 'de', seed: '2026-01-01' });
    const second = await post(appPort, { lang: 'de', seed: '2026-01-01' });
    const third = await post(appPort, { lang: 'de', seed: '2026-01-01' });

    assert.strictEqual(stubCalls, 1, 'three visitors must cost exactly one AI call');
    assert.strictEqual(second.frage, first.frage, 'everyone sees the same question of the day');
    assert.strictEqual(third.cached, true, 'repeat answers are marked as served from memory');
  });

  it('generates separately per language', async () => {
    const before = stubCalls;
    await post(appPort, { lang: 'en', seed: '2026-01-01' });
    assert.strictEqual(stubCalls, before + 1, 'English needs its own question');
    await post(appPort, { lang: 'en', seed: '2026-01-01' });
    assert.strictEqual(stubCalls, before + 1, 'and is cached too');
  });

  it('bundles simultaneous visitors into a single call', async () => {
    const before = stubCalls;
    await Promise.all(Array.from({ length: 6 }, () => post(appPort, { lang: 'de', seed: '2026-02-02' })));
    assert.strictEqual(stubCalls, before + 1, 'six at once must not trigger six calls');
  });
});
