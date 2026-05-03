# Migration guide — adoptar `@proportione/logger` / `proportione-logger` / `proportione/logger`

Cómo migrar cada repo de Proportione del wrapper actual al toolkit.

---

## Antes de empezar

1. Verifica que el paquete está publicado: `npm view @proportione/logger version` (o equivalente para Python/PHP).
2. Lee la [spec](./spec.md) — sobre todo sección 1 (API) y 6 (env vars).
3. Define tu `LOG_FILE` y mete `logs/` en `.gitignore` si no está ya.

---

## Patrón general (cualquier lenguaje)

1. Instalar el paquete (`npm i`, `pip install`, `composer require`).
2. Reemplazar el wrapper actual con `createLogger(...)` del toolkit.
3. Cambiar imports en los callers (típicamente `grep -rln 'from.*logger' src/`).
4. Configurar env vars en deploy: `LOG_LEVEL`, `LOG_FILE` (opcional para Cloud Run, no necesario porque stdout va a Cloud Logging).
5. Borrar el wrapper antiguo.
6. Tests: si tu test suite assertaba el formato del logger antiguo, actualizar fixtures.

---

## Repo: `automation-brain` (Node.js — core-api)

**Wrapper actual**: `clientes/proportione/proyectos/servicios/core-api/src/logger.mjs` (43 LOC, custom JSON GCP).

**Diff esperado**:

```js
// ANTES
import { logger } from './logger.mjs';
logger.info({ requestId }, 'mensaje');

// DESPUÉS
import { createLogger } from '@proportione/logger';
const logger = createLogger({ name: 'core-api', file: process.env.LOG_FILE });
logger.info({ requestId }, 'mensaje');
```

**Ficheros a tocar**:
- `package.json`: añadir `"@proportione/logger": "^0.1.0"`.
- `src/logger.mjs`: borrar.
- `src/index.mjs` o donde haga la inicialización: nuevo `createLogger(...)`.
- ~15 ficheros que importan `from './logger.mjs'`: cambiar a `from '@proportione/logger'`.

**Verificación post-deploy**:

```bash
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=proportione-core-api' --limit 5 --format=json | jq '.[].jsonPayload.severity'
# Debe devolver "INFO", "WARNING", "ERROR" — no "level" plano.
```

---

## Repo: `Aviaria` (Python — comun/api)

**Wrapper actual**: `comun/api/middleware.py` (50 LOC, stdlib `logging` + `RequestLoggingMiddleware`).

**Diff esperado**:

```python
# ANTES
import logging
logger = logging.getLogger(__name__)
logger.info("Request received", extra={"request_id": req_id})

# DESPUÉS
from proportione_logger import create_logger
logger = create_logger(name='aviaria', file=os.environ.get('LOG_FILE'))
logger.info("Request received", request_id=req_id)
```

**Ficheros a tocar**:
- `pyproject.toml`: añadir `proportione-logger = "^0.1.0"`.
- `comun/api/middleware.py`: el `RequestLoggingMiddleware` puede quedarse, solo cambia el logger interno.
- Cada `logging.getLogger(__name__)` → `create_logger(name=__name__)`.

**Nota**: structlog (que usa `proportione-logger` por debajo) integra con stdlib `logging`, así que las librerías de FastAPI/uvicorn que usan stdlib siguen funcionando. Solo los callers explícitos del logger cambian.

---

## Repo: `IITD` (Node.js — panel + integraciones)

**Wrapper actual**: ninguno. Usa `console.log` directo con prefix `[SCRIPT_NAME]` ad-hoc.

**Diff esperado**:

```js
// ANTES
console.log(`[stripe-webhook] Procesando event ${event.id}`);

// DESPUÉS
import { createLogger } from '@proportione/logger';
const log = createLogger({ name: 'iitd-stripe-webhook' });
log.info({ eventId: event.id }, 'Procesando event');
```

**Ficheros a tocar**:
- Todos los puntos de entrada (panel, webhooks, scripts).
- Añadir 1 import + 1 createLogger por servicio.

---

## Repo: `porqueViven` mu-plugins (PHP — WordPress)

**Wrapper actual**: ninguno. `error_log()` directo.

**Diff esperado**:

```php
// ANTES
error_log('[pv-voluntariado] Form submitted: ' . $email);

// DESPUÉS
use Proportione\Logger\Logger;
$log = Logger::create(name: 'pv-voluntariado');
$log->info('Form submitted', ['email' => $email]);
```

**Ficheros a tocar**:
- `composer.json` del mu-plugin: añadir `"proportione/logger": "^0.1.0"`.
- En cada mu-plugin, instanciar el logger en el bootstrap.

**Nota WordPress**: `error_log()` sigue funcionando para cosas críticas que quieras ver siempre en `wp-content/debug.log`. El logger nuevo es para eventos estructurados que el equipo quiere consultar después.

---

## Repos: Mensoft, Stackby, Google Ads, Hispanidad, proportione-engineering

Caso `console.log`/`print` directos. Patrón idéntico al de IITD (Node) o al de Aviaria (Python). Migración simple, ~30 min por repo.

---

## Rollback

Si algo se rompe en producción:

- **Cloud Run**: rollback a la revisión anterior con `gcloud run services update-traffic <service> --to-revisions=<previous>=100`.
- **Resto**: revertir el commit que añadía `@proportione/logger` y reinstalar el wrapper antiguo desde git history.

El toolkit es una dep externa: en cualquier momento se puede pinnear a una versión específica (`"@proportione/logger": "0.1.0"` exact) o sustituir por una alternativa.

---

## Cuándo NO migrar (todavía)

- Repos en cierre/archive: no merece la pena tocarlos.
- Scripts one-shot: si el script es "se corre 1 vez y se borra", `console.log` está bien.
- Mu-plugins WordPress muy simples (1 hook, 5 líneas): `error_log` directo es suficiente.

La regla: migrar cuando el código del repo viva ≥6 meses y tenga >1 punto donde se logea estructuradamente.
