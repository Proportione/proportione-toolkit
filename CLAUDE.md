# CLAUDE.md — proportione-toolkit

Contexto operativo para sesiones de Claude Code en este repo.

## Qué es este repo

Monorepo con utilidades compartidas para los proyectos de Proportione. **Una sola spec, tres implementaciones** (Node, Python, PHP). Empieza por `logger`; crece con otros patrones cuando aparezcan duplicados ≥3 veces.

## Estructura

```
packages/
├── logger-js/       npm @proportione/logger        (Pino)
├── logger-py/       pypi proportione-logger         (structlog)
└── logger-php/      composer proportione/logger     (Monolog)
docs/
├── spec.md          contrato común JS ↔ Python ↔ PHP
├── migration-guide.md   cómo migrar cada repo de Proportione
└── adr/             decisiones de arquitectura
```

## Principios anti-sobreingeniería (ver `/code/CLAUDE.md` global)

1. **Empezar pequeño**: 1 utilidad (logger) en 3 lenguajes, no 5 paquetes a la vez.
2. **Crecer con evidencia**: el siguiente paquete nace cuando ≥3 repos duplican el mismo patrón. No anticipar.
3. **Quality bar alta**: el repo es público, cada commit es visible. Tests obligatorios, README claro, sin TODOs en main.
4. **Mismo contrato cross-language**: si el logger-js cambia API, el logger-py y logger-php cambian a la vez. La spec.md es la fuente de verdad.

## Stack por paquete

| Paquete | Stack | Razón |
|---|---|---|
| `logger-js` | Pino v9 + pino-roll | 5x más rápido que Winston, JSON nativo, transports modulares. Estándar 2026. |
| `logger-py` | structlog v24 | 25% más rápido que Loguru en JSON, processor pipeline limpio, integra con stdlib `logging` para handlers. |
| `logger-php` | Monolog v3 | Estándar de facto en PHP, integra con Laravel/Symfony/WordPress, transports configurables. |

## Versionado

[Changesets](https://github.com/changesets/changesets) para Node. Para Python y PHP, versiones manuales en `pyproject.toml` y `composer.json` siguiendo SemVer alineado con la spec.

## Publicación

| Lenguaje | Registry | Trigger |
|---|---|---|
| Node | [npm @proportione](https://www.npmjs.com/org/proportione) | tag `logger-js@x.y.z` → GH Action `npm publish` |
| Python | [PyPI proportione-logger](https://pypi.org/project/proportione-logger/) | tag `logger-py@x.y.z` → GH Action `twine upload` |
| PHP | [Packagist proportione/logger](https://packagist.org/packages/proportione/logger) | webhook GH → Packagist auto-update |

Decisión de registry público: ver `docs/adr/0001-registry-publico.md`.

## Cómo testar localmente antes de publicar

```bash
cd packages/logger-js && node tests/test.mjs
cd packages/logger-py && pytest
cd packages/logger-php && composer test
```

## Convenciones de commit

`<scope>(logger-js|logger-py|logger-php|docs|root): <descripción>`

Ejemplos:
- `feat(logger-js): añadir transport stdout JSON con GCP severity`
- `fix(logger-py): corregir padding cuando scope > 25 chars`
- `docs(spec): aclarar comportamiento de latest.log en Windows`

## Cuando trabajes con Claude Code

- Antes de añadir un paquete nuevo: confirma que hay ≥3 repos duplicando el patrón. Si no, **no lo añadas**.
- Antes de breaking change en spec: actualiza `docs/spec.md` primero, luego los 3 paquetes a la vez.
- Antes de publicar: corre tests de los 3 paquetes en local. Si uno falla, no publica ninguno.
