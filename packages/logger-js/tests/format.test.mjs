import { test } from 'node:test';
import assert from 'node:assert';
import { formatPaddedLine } from '../src/format.mjs';

test('formatPaddedLine: padding columnar correcto', () => {
  const line = formatPaddedLine({
    severity: 'INFO',
    time: '2026-05-03T18:30:00.123Z',
    name: 'core-api',
    scope: 'core-api',
    msg: 'Servicio arrancado',
  }, { doSanitize: false });
  // INFO (5) + ' ' + ts (19) + ' ' + scope (25) + '  ' + msg
  assert.match(line, /^INFO  2026-05-03 18:30:00 core-api {17}  Servicio arrancado$/);
});

test('formatPaddedLine: incluye fields entre llaves', () => {
  const line = formatPaddedLine({
    severity: 'WARN',
    time: '2026-05-03T18:30:00.123Z',
    name: 'sla',
    scope: 'sla',
    msg: 'breach inminente',
    ticketId: 'AB12',
    minutes: 110,
  }, { doSanitize: false });
  assert.ok(line.includes('breach inminente  {ticketId=AB12,minutes=110}'));
});

test('formatPaddedLine: trunca scope >25 chars con elipsis', () => {
  const line = formatPaddedLine({
    severity: 'INFO',
    time: '2026-05-03T18:30:00.123Z',
    scope: 'core-api.support.tickets.urgentes.routing',
    msg: 'x',
  }, { doSanitize: false });
  // 25 chars exactos en columna scope (24 + …)
  assert.match(line, /^INFO  2026-05-03 18:30:00 core-api\.support\.tickets…  x$/);
});

test('formatPaddedLine: aplica sanitize por defecto', () => {
  const line = formatPaddedLine({
    severity: 'INFO',
    time: '2026-05-03T18:30:00.123Z',
    scope: 'auth',
    msg: 'token=abc123 enviado',
  });
  assert.ok(line.includes('token=[REDACTED]'));
  assert.ok(!line.includes('abc123'));
});

test('formatPaddedLine: convierte level numérico Pino a severity', () => {
  const line = formatPaddedLine({
    level: 50,
    time: '2026-05-03T18:30:00.123Z',
    scope: 'x',
    msg: 'oops',
  }, { doSanitize: false });
  assert.match(line, /^FATAL/);
});

test('formatPaddedLine: padea severity ERROR a 5 chars', () => {
  const line = formatPaddedLine({
    severity: 'ERROR',
    time: '2026-05-03T18:30:00.123Z',
    scope: 'x',
    msg: 'fail',
  }, { doSanitize: false });
  // ERROR (5) + ' ' + ts (19) + ' ' + scope padded (25) + '  ' + msg
  assert.strictEqual(line.slice(0, 5), 'ERROR');
  assert.strictEqual(line[5], ' ');
});
