import { test } from 'node:test';
import assert from 'node:assert';
import { sanitize } from '../src/sanitizer.mjs';

test('sanitize: redacts Bearer tokens', () => {
  const out = sanitize('Authorization: Bearer abc123_xyz.token+/=ABC');
  assert.strictEqual(out, 'Authorization: Bearer [REDACTED]');
});

test('sanitize: redacts password=', () => {
  assert.strictEqual(sanitize('password=secret123'), 'password=[REDACTED]');
  assert.strictEqual(sanitize('PASSWORD=foo'), 'PASSWORD=[REDACTED]');
});

test('sanitize: redacts token=', () => {
  assert.strictEqual(sanitize('foo token=abc bar'), 'foo token=[REDACTED] bar');
});

test('sanitize: redacts api_key= and api-key=', () => {
  assert.strictEqual(sanitize('api_key=ABC'), 'api_key=[REDACTED]');
  assert.strictEqual(sanitize('api-key=XYZ'), 'api-key=[REDACTED]');
});

test('sanitize: leaves clean text untouched', () => {
  const text = 'INFO  2026-05-03 18:30:00 core-api  Servicio arrancado  {requestId=abc}';
  assert.strictEqual(sanitize(text), text);
});

test('sanitize: handles non-string input', () => {
  assert.strictEqual(sanitize(null), null);
  assert.strictEqual(sanitize(undefined), undefined);
  assert.strictEqual(sanitize(42), 42);
});
