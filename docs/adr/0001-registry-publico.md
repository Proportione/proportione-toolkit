# ADR-001: Registry público (npm, PyPI, Packagist)

**Estado**: Aceptada
**Fecha**: 2026-05-03
**Decisor**: Javier Cuervo (Proportione)

## Contexto

Necesitamos publicar los paquetes de `proportione-toolkit` (`@proportione/logger`, `proportione-logger`, `proportione/logger`) para que los repos de Proportione (`automation-brain`, `Aviaria`, `IITD`, `porqueViven`, etc.) puedan consumirlos como dependencias estándar via `npm install` / `pip install` / `composer require`.

Hay dos caminos:

- **A. Privado** (GitHub Packages, GCP Artifact Registry): el código solo es accesible para miembros de la org. Requiere `.npmrc` con auth token en cada repo, configuración de CI con secrets, etc.
- **B. Público** (npmjs.com, pypi.org, packagist.org): cualquier persona puede instalar los paquetes. Cero infraestructura nueva.

## Decisión

Elegimos **B (público)** para los 3 paquetes del toolkit (`@proportione/logger`, `proportione-logger`, `proportione/logger`).

## Razones

1. **Cero infraestructura nueva**: npmjs.com, pypi.org y packagist.org ya existen y son gratuitos. No hay que configurar GH Packages, GCP Artifact Registry, ni `.npmrc`/`.pip.conf`/`auth.json` con tokens en cada repo.

2. **Consistente con la estrategia GitHub público de Proportione**: la org ya publica `proportione-plugins`, `voxelers-3d`, `engineering`, `claude-code-showcase`. El toolkit cabe en esa narrativa de "estrategia, investigación, publicaciones" sin añadir disonancia.

3. **El código no contiene datos cliente** ni lógica confidencial. Es código genérico de buenas prácticas (un wrapper sobre Pino / structlog / Monolog). Cero riesgo de leak.

4. **Bonus marketing**: un toolkit público de calidad funciona como showcase técnico para clientes B2B (alineado con el engineering blog `engineering.proportione.com`).

5. **Quality forcing function**: que el código sea visible obliga a quality bar alta — bueno para el equipo (no hay shortcuts feos visibles).

## Consecuencias aceptadas

- Cualquier persona puede leer el código → obliga a no commitear secrets, hardcoded URLs internas, ni convenciones que revelen infra de clientes. **Esto YA es nuestra norma**, no es coste nuevo.
- Si en el futuro aparece una utilidad que sí es confidencial (ej. wrapper sobre credenciales internas, lógica de routing por cliente), va en **otro repo privado**, no en este toolkit. La regla: "el toolkit es público; los privados van fuera".
- Versiones publicadas no se pueden borrar (npm policy). Hay que diseñar la spec con cuidado en v0.1.0 — los breaking changes requieren bump mayor (v0.2.0, v1.0.0, etc.).

## Alternativas descartadas

- **GitHub Packages**: requiere auth token en cada repo, fricción para developers nuevos, complica CI. El gain (privacidad) no compensa para código no confidencial.
- **GCP Artifact Registry**: aún más fricción, optimizado para imágenes Docker / containers, no para paquetes npm/pip cotidianos.
- **File: links / git submodules**: opción "rápida y sucia" donde cada repo importa el toolkit por path. Submodules son frágiles y la sincronización es manual. Desestimado.

## Cuándo revisitar esta decisión

- Si aparece un paquete del toolkit que necesita ser confidencial → no se mete aquí, va a un repo privado distinto.
- Si npm/PyPI/Packagist cambian políticas de registry público que nos afecten (improbable).
- Si descubrimos un coste operativo no previsto (typosquatting, abuso del nombre `@proportione/`, etc.) → considerar GH Packages.
