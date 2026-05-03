# Spec del logger — contrato común JS ↔ Python ↔ PHP

**Versión**: 0.1.0 (2026-05-03)
**Estado**: Borrador inicial. Cambios mayores → bump `0.x.0` (breaking).

Esta spec define el comportamiento que **los 3 paquetes** (`@proportione/logger`, `proportione-logger`, `proportione/logger`) deben cumplir. Si un paquete diverge de esta spec, es un bug — la spec gana.

---

## 1. API mínima (idéntica en los 3 lenguajes)

### Constructor

```
createLogger({
  name:         string,             // identificador del servicio, ej. 'core-api'
  level:        string?,            // 'debug'|'info'|'warn'|'error'|'fatal' (default 'info')
  file:         string?,            // path al fichero log, ej. 'logs/core-api.log' (default null = solo stdout)
  format:       string?,            // 'json'|'text'|'pretty' (default 'json' para stdout)
  scope:        string?,            // sub-componente, ej. 'support.tickets' (default = name)
  fields:       object?,            // campos extra que se añaden a TODA línea (ej. { region: 'eu-west1' })
  maxSizeMB:    number?,            // tamaño max del fichero antes de rotar (default 10)
  retention:    number?,            // ficheros rotados que se conservan (default 5)
  sanitize:     boolean?,           // redactar secrets en file output (default true)
})
→ Logger
```

### Métodos del Logger

```
log.debug(fields | string, message?)
log.info(fields | string, message?)
log.warn(fields | string, message?)
log.error(fields | string, message?)
log.fatal(fields | string, message?)

log.child({ requestId: '...', ... }) → Logger    // logger derivado con contexto
log.flush() → Promise<void>                       // forzar flush de buffers
```

**Convención cross-language**:
- En **Node** y **PHP**, los argumentos van como `(fields, message)` o `(message)` según conveniencia.
- En **Python**, se usa `log.info(message, **kwargs)` para alinearse con stdlib idiom (kwargs son los `fields`).

Ambas formas producen el mismo output.

---

## 2. Niveles de log

| Nombre  | Numérico | GCP Cloud Logging severity |
|---------|----------|----------------------------|
| `debug` | 10       | `DEBUG`                    |
| `info`  | 20       | `INFO`                     |
| `warn`  | 30       | `WARNING`                  |
| `error` | 40       | `ERROR`                    |
| `fatal` | 50       | `CRITICAL`                 |

`level` configurable filtra: si `level='warn'`, los `debug` y `info` se descartan antes de escribir.

---

## 3. Dual transport simultáneo

Cada llamada a `log.info(...)` escribe en **dos sitios** (cuando `file` está configurado):

### 3.1 stdout — JSON estructurado

Una línea por evento. Formato:

```json
{
  "severity": "INFO",
  "timestamp": "2026-05-03T18:30:00.123Z",
  "name": "core-api",
  "scope": "support.tickets",
  "message": "Ticket cerrado #20260501-JavierParedes",
  "requestId": "abc-123",
  "...": "campos custom del caller"
}
```

**Por qué `severity` y no `level`**: GCP Cloud Logging detecta automáticamente el campo `severity` en jsonPayload sin parser custom. `level` requeriría un parser, `severity` no.

### 3.2 fichero — texto con padding columnar

Una línea por evento. Formato:

```
INFO  2026-05-03 18:30:00 core-api.support.tickets  Ticket cerrado #20260501-JavierParedes  {requestId=abc-123}
WARN  2026-05-03 18:30:01 core-api.support.tickets  SLA cerca del breach                    {ticketId=AB12,minutes=110}
ERROR 2026-05-03 18:30:02 core-api.email            Resend devolvió 500                     {emailId=re_xy,attempt=2}
```

**Padding**:
- `LEVEL`: 5 chars, left-aligned (`INFO `, `WARN `, `ERROR`, `DEBUG`, `FATAL`).
- `TIMESTAMP`: 19 chars ISO 8601 sin TZ (`YYYY-MM-DD HH:MM:SS`).
- `SCOPE`: 25 chars, truncate con `…` si más largo.
- `MESSAGE`: libre, sin padding (puede ocupar el resto de línea).
- `FIELDS`: opcional, al final entre `{}` con `key=value` separados por coma.

**Permite filtrado vertical**:

```bash
grep "ERROR" logs/latest.log
# alinea todas las líneas ERROR en columnas perfectas

grep "core-api.support" logs/latest.log
# todas las del módulo support, fácil de leer
```

---

## 4. `latest.log` symlink

Cada arranque del logger:

1. Crea/recrea symlink `logs/latest.log` apuntando al fichero rotativo del proceso actual.
2. Si `LOG_FILE=logs/core-api.log`, entonces `logs/latest.log` → `logs/core-api.log`.

**Beneficio**: `tail -f logs/latest.log` siempre sigue lo último, sin saber el nombre del fichero. Útil en dev local cuando reinicias el proceso múltiples veces.

**En Windows**: si los symlinks no están disponibles, se copia el path como `logs/latest.log.txt` con el path absoluto del log activo.

---

## 5. Rotación

- Por **tamaño** (default 10 MB): cuando el fichero llega al límite, se renombra a `core-api.log.1`, los anteriores se desplazan (`.1` → `.2`, `.2` → `.3`, etc.).
- **Retención** (default 5 ficheros): cuando hay más de N rotados, se borran los más antiguos.
- Configurable via env vars (`LOG_MAX_SIZE_MB`, `LOG_RETENTION`) o constructor.

---

## 6. Configuración por env vars

Defaults sensatos para Cloud Run + dev local. Constructor sobreescribe env vars.

| Env var             | Default        | Equivale en constructor |
|---------------------|----------------|-------------------------|
| `LOG_LEVEL`         | `info`         | `level`                 |
| `LOG_FORMAT`        | `json`         | `format`                |
| `LOG_FILE`          | (none)         | `file`                  |
| `LOG_MAX_SIZE_MB`   | `10`           | `maxSizeMB`             |
| `LOG_RETENTION`     | `5`            | `retention`             |
| `LOG_SANITIZE`      | `true`         | `sanitize`              |

---

## 7. Request ID / trace ID

```js
const reqLog = log.child({ requestId: ctx.requestId });
reqLog.info('procesando webhook');
// → toda línea de reqLog incluye requestId automáticamente
```

Igual en Python (`log.bind(request_id=...)`) y PHP (`$log->withContext(['requestId' => ...])`).

---

## 8. Secret sanitization

Cuando `sanitize=true` (default), se aplica regex en **el output a fichero** (no a stdout JSON, donde se asume que GCP filtra):

| Patrón detectado | Reemplazo |
|---|---|
| `Authorization: Bearer <token>` | `Authorization: Bearer [REDACTED]` |
| `password=<value>` (case-insensitive) | `password=[REDACTED]` |
| `token=<value>` | `token=[REDACTED]` |
| `api[_-]?key=<value>` | `api_key=[REDACTED]` |
| Strings >50 chars con entropy alta (heurística básica) | `[REDACTED-HIGH-ENTROPY]` |

**Nota**: la sanitización no es una garantía de seguridad, es una capa extra. La regla principal sigue siendo "no logear secrets a propósito". Los 3 paquetes incluyen tests con secrets típicos para validar.

---

## 9. Coloración

- **TTY** (terminal interactivo): los niveles ERROR y FATAL salen en rojo, WARN en amarillo, INFO sin color, DEBUG en gris. **Solo en formato `text` o `pretty`**, nunca en `json`.
- **No-TTY** (pipe a fichero, Cloud Run): sin color. Se detecta con `process.stdout.isTTY` (Node), `sys.stdout.isatty()` (Python), `posix_isatty(STDOUT)` (PHP).

---

## 10. GCP Cloud Logging compatibility

El JSON de stdout debe ser parseado correctamente por Cloud Logging cuando se ejecuta en Cloud Run:

- `severity` → mapea automáticamente a la columna severity.
- `message` → aparece en el resumen de la entrada.
- `httpRequest` (campo opcional) → si se usa con la estructura `{ requestMethod, requestUrl, status, latency }`, Cloud Logging lo detecta como request log.
- `trace` (opcional, formato `projects/{project}/traces/{traceId}`) → integra con Cloud Trace.

Los 3 paquetes incluyen helper `logHttpRequest(req, res, latencyMs)` que arma el campo correcto.

---

## 11. Tests obligatorios para cada paquete

Cada paquete debe pasar estos tests para considerar la implementación correcta:

1. `info('texto simple')` → 1 línea JSON en stdout + 1 línea texto en fichero.
2. `info({ requestId: 'x' }, 'msg')` → JSON tiene `requestId`, fichero también lo muestra en `{}`.
3. `child({ scope: 'sub' })` → todas las líneas siguientes incluyen el contexto.
4. `level='warn'` → llamadas a `info`/`debug` no producen output.
5. Rotación: escribir 11 MB → fichero principal queda <10 MB, hay un `.1` con el resto.
6. `latest.log` existe como symlink (Linux/Mac) o `.txt` con path (Windows).
7. Padding: `INFO ` exactamente 5 chars, timestamp exactamente 19 chars, scope exactamente 25 chars con truncate `…`.
8. Sanitización: `info({ password: 'secret123' })` → fichero muestra `[REDACTED]`, stdout JSON muestra `secret123`.
9. TTY: con `isTTY=true`, `error()` produce ANSI rojo en stdout. Con `isTTY=false`, sin ANSI.
10. Cross-language: una línea de Node y otra de Python con el mismo input producen JSON con los mismos campos clave (mismo nombre, mismo timestamp shape, misma `severity`).

---

## 12. Versionado

- v0.x.y: alpha, breaking changes posibles.
- v1.0.0: API estable, breaking changes solo en majors.
- Cualquier cambio al spec.md que rompa compatibilidad de output (ej. cambiar formato de timestamp) → bump major en los 3 paquetes simultáneamente.

---

## 13. Roadmap

- v0.1.0: features 1-10 obligatorias en los 3 paquetes.
- v0.2.0: añadir helper `logHttpRequest` para Cloud Logging integration.
- v0.3.0: añadir Sentry/Datadog transport opcional (cuando aparezca demanda).
- v1.0.0: cuando los 3 paquetes hayan tenido ≥1 mes de uso en producción sin breaking change.

---

## Referencias

- [Pino docs (Node)](https://github.com/pinojs/pino)
- [structlog docs (Python)](https://www.structlog.org)
- [Monolog docs (PHP)](https://github.com/Seldaek/monolog)
- [Google Cloud Logging structured logging](https://cloud.google.com/logging/docs/structured-logging)
- [12-factor app — Logs](https://12factor.net/logs)
