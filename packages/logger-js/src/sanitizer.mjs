// Regex-based secret redaction. Aplicado al output a fichero, no a stdout JSON.
// Spec sec. 8.

// Caracteres que terminan un valor (separadores comunes: espacio, coma, ;, &, comillas, llaves, paréntesis).
// Importante incluir }) para no comerse el cierre de los wrappers `{key=value}` del file output.
const VALUE_END = `[^\\s,;&"'})\\]]+`;

const PATTERNS = [
  [new RegExp(`(Authorization:\\s*Bearer\\s+)[A-Za-z0-9._\\-+/=]+`, 'gi'), '$1[REDACTED]'],
  [new RegExp(`(password\\s*[=:]\\s*)${VALUE_END}`, 'gi'), '$1[REDACTED]'],
  [new RegExp(`(token\\s*[=:]\\s*)${VALUE_END}`, 'gi'), '$1[REDACTED]'],
  [new RegExp(`(api[_-]?key\\s*[=:]\\s*)${VALUE_END}`, 'gi'), '$1[REDACTED]'],
];

export function sanitize(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
