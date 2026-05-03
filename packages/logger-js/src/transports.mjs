// Transports duales: stdout JSON (Pino default) + fichero texto con padding columnar.
// Symlink latest.log al fichero del proceso actual.
// Spec sec. 3 y 4.

import {
  createWriteStream, mkdirSync, existsSync,
  unlinkSync, lstatSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, basename, resolve, join } from 'node:path';
import { Transform } from 'node:stream';
import { formatPaddedLine } from './format.mjs';

// Crea un Transform que recibe JSON de Pino y emite líneas con padding columnar.
// Sanitiza secrets si doSanitize=true.
export function createPaddedFileTransport({ file, doSanitize = true }) {
  if (!file) throw new Error('createPaddedFileTransport requires { file }');

  const absFile = resolve(file);
  const dir = dirname(absFile);
  mkdirSync(dir, { recursive: true });

  const writer = createWriteStream(absFile, { flags: 'a' });

  const transform = new Transform({
    writableObjectMode: false,
    transform(chunk, _enc, cb) {
      try {
        const text = chunk.toString('utf8');
        const lines = text.split('\n').filter(Boolean);
        const out = lines.map(line => {
          try {
            const obj = JSON.parse(line);
            return formatPaddedLine(obj, { doSanitize });
          } catch {
            return line; // fallback raw si no es JSON parseable
          }
        }).join('\n') + '\n';
        cb(null, out);
      } catch (err) {
        cb(err);
      }
    },
  });

  transform.pipe(writer);
  ensureLatestSymlink(absFile);
  return transform;
}

// Crea/recrea el symlink `<dir>/latest.log` apuntando a `<basename(file)>`.
// En sistemas sin symlink (ej. Windows sin permisos), escribe el path absoluto
// en `<dir>/latest.log.txt` como fallback (spec sec. 4).
export function ensureLatestSymlink(absFile) {
  const dir = dirname(absFile);
  const linkPath = join(dir, 'latest.log');
  const target = basename(absFile);

  if (basename(absFile) === 'latest.log') return; // evita loop si el file ya se llama latest.log

  try {
    if (existsSync(linkPath) || lstatExists(linkPath)) {
      unlinkSync(linkPath);
    }
    symlinkSync(target, linkPath);
  } catch (err) {
    // Fallback Windows / permisos restrictivos: escribir path absoluto en .txt
    try {
      writeFileSync(`${linkPath}.txt`, absFile + '\n');
    } catch {
      // silent fail — el logger sigue funcionando aunque latest.log no se cree
    }
  }
}

function lstatExists(p) {
  try { lstatSync(p); return true; } catch { return false; }
}
