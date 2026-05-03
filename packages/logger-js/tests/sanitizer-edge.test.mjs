import { test } from 'node:test';
import assert from 'node:assert';
import { sanitize } from '../src/sanitizer.mjs';

// Regression: la regex no debe comerse el `}` del wrapper de fields.
test('sanitize: NO se traga el } final del wrapper {key=val}', () => {
  const input = 'msg  {headers=Authorization: Bearer abc123,password=shh}';
  const out = sanitize(input);
  assert.ok(out.endsWith('}'), `debe terminar en } — got: ${out}`);
  assert.ok(out.includes('password=[REDACTED]'));
  assert.ok(out.includes('Bearer [REDACTED]'));
});

test('sanitize: NO se traga ] de valores entre brackets', () => {
  const input = 'tags=[token=abc] otro';
  const out = sanitize(input);
  assert.ok(out.includes('token=[REDACTED]'));
  assert.ok(out.includes(']'), `debe preservar ] — got: ${out}`);
});

test('sanitize: múltiples secrets en la misma línea', () => {
  const input = '{password=p1,token=t1,api_key=k1,api-key=k2}';
  const out = sanitize(input);
  assert.ok(!out.includes('p1'));
  assert.ok(!out.includes('t1'));
  assert.ok(!out.includes('k1'));
  assert.ok(!out.includes('k2'));
  assert.ok(out.endsWith('}'));
});
