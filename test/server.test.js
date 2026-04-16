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
