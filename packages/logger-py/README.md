# proportione-logger

Logger Python para servicios de Proportione. structlog-based. Implementa la [spec proportione-toolkit](../../docs/spec.md).

> **Estado**: 🚧 0.1.0a1 — paquete en construcción. Implementación pendiente.

## Instalación (cuando esté publicado)

```bash
pip install proportione-logger
```

## Uso

```python
from proportione_logger import create_logger
import os

log = create_logger(
    name='aviaria',
    level=os.environ.get('LOG_LEVEL', 'info'),
    file=os.environ.get('LOG_FILE'),  # opcional
)

log.info('Servicio arrancado', request_id='abc')
log.error('Algo se rompió', err=str(e))

child_log = log.bind(scope='aviaria.routing')
child_log.warn('Latencia alta', ms=850)
```

## Output

**stdout** (JSON, GCP-friendly):
```json
{"severity":"INFO","timestamp":"2026-05-03T18:30:00.123Z","name":"aviaria","message":"Servicio arrancado","request_id":"abc"}
```

**fichero** (texto, padding columnar idéntico a Node y PHP):
```
INFO  2026-05-03 18:30:00 aviaria                   Servicio arrancado  {request_id=abc}
WARN  2026-05-03 18:30:01 aviaria.routing           Latencia alta  {ms=850}
```

## Spec completa

[docs/spec.md](../../docs/spec.md)

## Stack

- [structlog v24+](https://www.structlog.org) — 25% más rápido que Loguru en JSON serialization, processor pipeline limpio.
- Stdlib `logging.handlers.RotatingFileHandler` — rotación nativa.

## Licencia

[MIT](../../LICENSE)
