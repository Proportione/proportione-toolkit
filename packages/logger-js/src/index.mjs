// @proportione/logger — entry point.
// Spec: ../../docs/spec.md.

import pino from 'pino';
import { createPaddedFileTransport } from './transports.mjs';

const LEVEL_TO_SEVERITY = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

function envOr(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function envBool(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return v === 'true' || v === '1';
}

function envNum(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// createLogger({ name, level?, file?, scope?, fields?, sanitize? }) → Pino logger
//
// Defaults via env vars:
//   LOG_LEVEL       → level (default 'info')
//   LOG_FORMAT      → 'json' (only json supported in v0.1.0; 'text'/'pretty' future)
//   LOG_FILE        → file (default null = solo stdout)
//   LOG_MAX_SIZE_MB → maxSizeMB (default 10) — NO USADO en v0.1.0 (rotation futura)
//   LOG_RETENTION   → retention (default 5) — NO USADO en v0.1.0
//   LOG_SANITIZE    → sanitize (default true)
export function createLogger(options = {}) {
  if (!options.name) throw new Error('createLogger requires { name }');

  const opts = {
    name: options.name,
    level: options.level ?? envOr('LOG_LEVEL', 'info'),
    file: options.file ?? envOr('LOG_FILE', null),
    scope: options.scope ?? options.name,
    fields: options.fields ?? {},
    sanitize: options.sanitize ?? envBool('LOG_SANITIZE', true),
    maxSizeMB: options.maxSizeMB ?? envNum('LOG_MAX_SIZE_MB', 10),
    retention: options.retention ?? envNum('LOG_RETENTION', 5),
  };

  // Pino formatter: convierte level numérico a severity GCP, añade scope + fields.
  const formatters = {
    level(label) {
      return { severity: LEVEL_TO_SEVERITY[label] || label.toUpperCase() };
    },
    bindings(_bindings) {
      return { name: opts.name, scope: opts.scope, ...opts.fields };
    },
  };

  // Streams: stdout siempre; file si está configurado.
  const streams = [{ level: opts.level, stream: process.stdout }];
  if (opts.file) {
    const fileStream = createPaddedFileTransport({
      file: opts.file,
      doSanitize: opts.sanitize,
    });
    streams.push({ level: opts.level, stream: fileStream });
  }

  return pino(
    {
      level: opts.level,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters,
      // base: false elimina pid/hostname para output más limpio.
      // El caller puede añadir esos vía child() si los necesita.
      base: undefined,
    },
    pino.multistream(streams),
  );
}

export { sanitize } from './sanitizer.mjs';
export { formatPaddedLine } from './format.mjs';
