import { test, after } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readFileSync, existsSync, lstatSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogger } from '../src/index.mjs';

function tmpFile() {
  const dir = mkdtempSync(join(tmpdir(), 'logger-js-test-'));
  return { dir, file: join(dir, 'svc.log') };
}

test('createLogger requires { name }', () => {
  assert.throws(() => createLogger({}), /requires \{ name \}/);
});

test('createLogger returns object with debug/info/warn/error/fatal methods', () => {
  const log = createLogger({ name: 'test' });
  assert.ok(typeof log.debug === 'function');
  assert.ok(typeof log.info === 'function');
  assert.ok(typeof log.warn === 'function');
  assert.ok(typeof log.error === 'function');
  assert.ok(typeof log.fatal === 'function');
  assert.ok(typeof log.child === 'function');
});

test('logger writes JSON to stdout (smoke: no throw)', () => {
  const log = createLogger({ name: 'smoke' });
  // Solo verificamos que no lance. La asserción de stdout sería más invasiva.
  log.info({ foo: 'bar' }, 'mensaje smoke');
  log.warn('warn smoke');
  log.error({ err: new Error('x') }, 'error smoke');
});

test('logger escribe a fichero con padding columnar + symlink latest.log', { timeout: 3000 }, async () => {
  const { dir, file } = tmpFile();
  const log = createLogger({ name: 'core-api', file });
  log.info({ requestId: 'abc' }, 'Servicio arrancado');
  log.warn({ ticketId: 'AB12' }, 'breach inminente');

  // Esperar al flush async del Transform stream
  await new Promise(r => setTimeout(r, 200));

  // Fichero existe + contiene las líneas
  assert.ok(existsSync(file), 'el fichero log debe existir');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes('Servicio arrancado'), `fichero debe contener msg, got: ${content}`);
  assert.ok(content.includes('breach inminente'), 'fichero debe contener segundo msg');
  assert.ok(content.includes('{requestId=abc}'), 'fichero debe contener fields');

  // Padding: cada línea empieza con LEVEL (5 chars) + ' '
  const lines = content.split('\n').filter(Boolean);
  for (const line of lines) {
    assert.match(line, /^(DEBUG|INFO |WARN |ERROR|FATAL) \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} /, `línea con padding: ${line}`);
  }

  // Symlink latest.log existe y apunta al fichero
  const latest = join(dir, 'latest.log');
  assert.ok(lstatSync(latest).isSymbolicLink(), 'latest.log debe ser symlink');

  rmSync(dir, { recursive: true, force: true });
});

test('child logger hereda contexto', { timeout: 3000 }, async () => {
  const { dir, file } = tmpFile();
  const log = createLogger({ name: 'svc', file });
  const child = log.child({ requestId: 'req-xyz', scope: 'svc.handler' });
  child.info('procesando');

  await new Promise(r => setTimeout(r, 200));
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes('procesando'), 'child log escribe');
  assert.ok(content.includes('requestId=req-xyz'), 'child log incluye requestId');

  rmSync(dir, { recursive: true, force: true });
});

test('level filter: warn no deja pasar info', { timeout: 3000 }, async () => {
  const { dir, file } = tmpFile();
  const log = createLogger({ name: 'svc', level: 'warn', file });
  log.info('no debería aparecer');
  log.warn('sí debería aparecer');

  await new Promise(r => setTimeout(r, 200));
  const content = readFileSync(file, 'utf8');
  assert.ok(!content.includes('no debería aparecer'), 'level filter funciona');
  assert.ok(content.includes('sí debería aparecer'), 'warn pasa');

  rmSync(dir, { recursive: true, force: true });
});

test('sanitization activa por defecto en file output', { timeout: 3000 }, async () => {
  const { dir, file } = tmpFile();
  const log = createLogger({ name: 'auth', file });
  log.info({ headers: 'Authorization: Bearer abc123secrettoken' }, 'login');

  await new Promise(r => setTimeout(r, 200));
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes('[REDACTED]'), `fichero debe sanitizar, got: ${content}`);
  assert.ok(!content.includes('abc123secrettoken'), 'token original no debe aparecer en fichero');

  rmSync(dir, { recursive: true, force: true });
});
