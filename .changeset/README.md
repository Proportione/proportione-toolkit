# Changesets

Versionado y changelog automatizados para paquetes Node del monorepo. Ver [docs](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md).

## Cuando hagas un cambio

```bash
pnpm changeset
```

Te pregunta:
1. Qué paquetes cambiaron.
2. Bump (patch / minor / major).
3. Resumen del cambio.

Genera un fichero markdown en este dir. Cuando merges a main, GH Action `version-packages` consume los changesets, bumpea versiones, actualiza `CHANGELOG.md` y publica a npm.

## Para Python y PHP

Los paquetes Python (`logger-py`) y PHP (`logger-php`) NO usan Changesets — las versiones se mantienen manualmente en `pyproject.toml` y `composer.json` siguiendo SemVer alineado con la spec.

Cuando bumpas versión major en cualquiera de los 3, los otros 2 también se bumpan major (regla "mismo contrato, misma versión").
