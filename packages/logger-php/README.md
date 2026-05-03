# proportione/logger

Logger PHP para servicios y mu-plugins WordPress de Proportione. Monolog-based. Implementa la [spec proportione-toolkit](../../docs/spec.md).

> **Estado**: 🚧 0.1.0-alpha1 — paquete en construcción. Implementación pendiente.

## Instalación (cuando esté publicado en Packagist)

```bash
composer require proportione/logger
```

## Uso

```php
<?php
use Proportione\Logger\Logger;

$log = Logger::create(
    name: 'pv-voluntariado',
    level: getenv('LOG_LEVEL') ?: 'info',
    file: getenv('LOG_FILE') ?: null,
);

$log->info('Form submitted', ['email' => $email, 'leadId' => $id]);
$log->error('DB insert failed', ['err' => $e->getMessage()]);

$childLog = $log->withContext(['scope' => 'pv-voluntariado.email']);
$childLog->warn('SPF no configurado', ['domain' => 'porqueviven.org']);
```

## Output

**stdout** (JSON, GCP-friendly):
```json
{"severity":"INFO","timestamp":"2026-05-03T18:30:00.123Z","name":"pv-voluntariado","message":"Form submitted","email":"x@y.com","leadId":42}
```

**fichero** (texto, padding columnar idéntico a Node y Python):
```
INFO  2026-05-03 18:30:00 pv-voluntariado           Form submitted  {email=x@y.com,leadId=42}
WARN  2026-05-03 18:30:01 pv-voluntariado.email     SPF no configurado  {domain=porqueviven.org}
```

## Uso en WordPress mu-plugins

```php
<?php
require_once WP_CONTENT_DIR . '/vendor/autoload.php';

use Proportione\Logger\Logger;

add_action('init', function() {
    $log = Logger::create(name: 'mu-' . basename(__FILE__, '.php'));
    $log->info('Plugin loaded');
});
```

`error_log()` sigue funcionando en paralelo para cosas críticas que quieras ver siempre en `wp-content/debug.log`.

## Spec completa

[docs/spec.md](../../docs/spec.md)

## Stack

- [Monolog v3](https://github.com/Seldaek/monolog) — estándar de facto en PHP, integra con Laravel/Symfony/WordPress.

## Licencia

[MIT](../../LICENSE)
