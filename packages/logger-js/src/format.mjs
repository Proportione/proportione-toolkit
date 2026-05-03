// Convierte una entrada de log JSON (Pino output) en línea de texto con padding columnar.
// Formato: LEVEL(5)  TIMESTAMP(19)  SCOPE(25)  MESSAGE  {fields=...}
// Spec sec. 3.2.

import { sanitize } from './sanitizer.mjs';

const RESERVED = new Set([
  'severity', 'level', 'time', 'timestamp', 'name', 'scope',
  'msg', 'message', 'pid', 'hostname', 'v',
]);

const LEVEL_WIDTH = 5;
const SCOPE_WIDTH = 25;

export function formatPaddedLine(obj, { doSanitize = true } = {}) {
  const rawSeverity = String(obj.severity || levelToSeverity(obj.level) || 'INFO');
  const severity = normalizeSeverity(rawSeverity).padEnd(LEVEL_WIDTH);
  const ts = formatTimestamp(obj.time || obj.timestamp);
  const scope = padOrTruncate(String(obj.scope || obj.name || '-'), SCOPE_WIDTH);
  const msg = obj.msg || obj.message || '';
  const fields = extractFields(obj);
  const fieldStr = fields ? `  {${fields}}` : '';
  let line = `${severity} ${ts} ${scope}  ${msg}${fieldStr}`;
  if (doSanitize) line = sanitize(line);
  return line;
}

// Normaliza severity GCP (variable) a etiqueta de 5 chars para el padding del fichero.
// GCP: DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT, EMERGENCY.
const SEVERITY_DISPLAY = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  NOTICE: 'NOTE',
  WARNING: 'WARN',
  ERROR: 'ERROR',
  CRITICAL: 'FATAL',
  ALERT: 'ALERT',
  EMERGENCY: 'EMERG',
};
function normalizeSeverity(s) {
  return SEVERITY_DISPLAY[s.toUpperCase()] || s.toUpperCase().slice(0, 5);
}

function formatTimestamp(t) {
  if (!t) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (typeof t === 'number') return new Date(t).toISOString().slice(0, 19).replace('T', ' ');
  if (typeof t === 'string') return t.slice(0, 19).replace('T', ' ');
  return String(t).slice(0, 19);
}

function padOrTruncate(s, width) {
  if (s.length > width) return s.slice(0, width - 1) + '…'; // …
  return s.padEnd(width);
}

function extractFields(obj) {
  const entries = [];
  for (const [k, v] of Object.entries(obj)) {
    if (RESERVED.has(k)) continue;
    entries.push(`${k}=${formatValue(v)}`);
  }
  return entries.length ? entries.join(',') : null;
}

function formatValue(v) {
  if (v === null || v === undefined) return String(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const LEVEL_TO_SEVERITY = {
  10: 'DEBUG', 20: 'INFO', 30: 'WARN', 40: 'ERROR', 50: 'FATAL', 60: 'FATAL',
  trace: 'DEBUG', debug: 'DEBUG', info: 'INFO', warn: 'WARN', error: 'ERROR', fatal: 'FATAL',
};

function levelToSeverity(level) {
  return LEVEL_TO_SEVERITY[level];
}
