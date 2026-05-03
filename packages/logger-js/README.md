# @proportione/logger

Logger Node.js para servicios de Proportione. Pino-based. Implementa la [spec proportione-toolkit](../../docs/spec.md).

> **Estado**: 🚧 0.1.0-pre — paquete en construcción. Implementación pendiente.

## Instalación (cuando esté publicado)

```bash
npm install @proportione/logger
```

## Uso

```js
import { createLogger } from '@proportione/logger';

const log = createLogger({
  name: 'core-api',
  level: process.env.LOG_LEVEL || 'info',
  file: process.env.LOG_FILE,        // opcional
});

log.info({ requestId: 'abc' }, 'Servicio arrancado');
log.error({ err: error }, 'Algo se rompió');

const childLog = log.child({ scope: 'support.tickets' });
childLog.warn({ ticketId: 'AB12' }, 'SLA cerca del breach');
```

## Output

**stdout** (JSON, GCP-friendly):
```json
{"severity":"INFO","timestamp":"2026-05-03T18:30:00.123Z","name":"core-api","message":"Servicio arrancado","requestId":"abc"}
```

**fichero** (texto, padding columnar):
```
INFO  2026-05-03 18:30:00 core-api                  Servicio arrancado  {requestId=abc}
ERROR 2026-05-03 18:30:01 core-api                  Algo se rompió  {err=...}
WARN  2026-05-03 18:30:02 core-api.support.tickets  SLA cerca del breach  {ticketId=AB12}
```

`tail -f logs/latest.log` para seguir lo último (symlink automático).

## Spec completa

[docs/spec.md](../../docs/spec.md)

## Stack

- [Pino v9](https://github.com/pinojs/pino) — logger core, 5x más rápido que Winston.
- [pino-roll v3](https://github.com/feugy/pino-roll) — rotación por tamaño + retención.

## Licencia

[MIT](../../LICENSE)
