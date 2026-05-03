# proportione-toolkit

Utilidades compartidas para los repos de [Proportione](https://github.com/Proportione). Un paquete por lenguaje, mismo contrato.

> **Estado**: 🚧 v0.1.0-pre — esqueleto del monorepo, paquetes en construcción. No publicar todavía.

## Por qué existe

Cada repo de Proportione (`automation-brain`, `Aviaria`, `IITD`, `porqueViven`, etc.) tenía su propio wrapper de logging — o usaba `console.log` / `print` directos. Eso supone:

- Reescribir las mismas 4 cosas en cada proyecto: padding columnar para `grep` visual, dual transport (stdout JSON + fichero legible), `latest.log` rotativo, formato consistente entre lenguajes.
- Divergencia: cuando arreglamos un bug en un wrapper, los demás siguen rotos.
- Onboarding: un dev nuevo aprende un logger distinto en cada repo.

`proportione-toolkit` resuelve esto con **un único contrato implementado en 3 lenguajes** (Node.js, Python, PHP), publicado en npm + PyPI + Packagist.

## Paquetes

| Lenguaje | Paquete | Stack base | Estado |
|---|---|---|---|
| Node.js (≥18) | [`@proportione/logger`](packages/logger-js) | [Pino](https://github.com/pinojs/pino) v9 + pino-roll | 🚧 en desarrollo |
| Python (≥3.11) | [`proportione-logger`](packages/logger-py) | [structlog](https://www.structlog.org) v24 + stdlib `logging.handlers` | 🚧 en desarrollo |
| PHP (≥8.1) | [`proportione/logger`](packages/logger-php) | [Monolog](https://github.com/Seldaek/monolog) v3 | 🚧 en desarrollo |

Spec del contrato común: [`docs/spec.md`](docs/spec.md).

## Quickstart (cuando esté publicado)

### Node.js

```bash
npm install @proportione/logger
```

```js
import { createLogger } from '@proportione/logger';

const log = createLogger({ name: 'my-service', file: 'logs/my-service.log' });
log.info({ requestId: 'abc' }, 'Servicio arrancado');
log.error({ err }, 'Algo se rompió');
```

### Python

```bash
pip install proportione-logger
```

```python
from proportione_logger import create_logger

log = create_logger(name='my-service', file='logs/my-service.log')
log.info('Servicio arrancado', request_id='abc')
log.error('Algo se rompió', err=str(e))
```

### PHP

```bash
composer require proportione/logger
```

```php
use Proportione\Logger\Logger;

$log = Logger::create(name: 'my-service', file: 'logs/my-service.log');
$log->info('Servicio arrancado', ['requestId' => 'abc']);
$log->error('Algo se rompió', ['err' => $e->getMessage()]);
```

En los 3 casos:

- `stdout` recibe **JSON estructurado** (Cloud Run / Cloud Logging lo consumen nativamente).
- El fichero recibe **texto con padding columnar** legible para `grep`.
- `logs/latest.log` es un **symlink** al fichero del proceso actual (siempre puedes hacer `tail -f logs/latest.log`).

Ver [`docs/spec.md`](docs/spec.md) para el contrato completo.

## Cómo contribuir

Repo monorepo gestionado con [pnpm workspaces](https://pnpm.io/workspaces) + [Changesets](https://github.com/changesets/changesets) para versionado.

```bash
git clone https://github.com/Proportione/proportione-toolkit
cd proportione-toolkit
pnpm install              # instala deps de los 3 paquetes
pnpm test                 # corre tests de los 3
pnpm changeset            # crea entry de versionado al hacer cambios
```

Conexión rápida con el CLAUDE.md del repo si trabajas con Claude Code: [`CLAUDE.md`](CLAUDE.md).

## Por qué público

Decisión documentada en [`docs/adr/0001-registry-publico.md`](docs/adr/0001-registry-publico.md). TL;DR: cero infra nueva, código sin datos cliente, consistente con la presencia GitHub pública de Proportione.

## Licencia

[MIT](LICENSE)
