// Confere pt.ts x en.ts: mesmas chaves, mesmos {{placeholders}}, mesmo formato de plural, sem texto vazio.
// Uso (na raiz do repositório): node .claude/skills/i18n-sync/verificar.mjs
// O typecheck já garante as chaves (en é tipado a partir de pt); aqui entram os placeholders e os plurais.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function load(path, exportName) {
  const source = readFileSync(path, 'utf8').replace(/^import type .*$/m, '');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: 'CommonJS', target: 'ES2020' },
  }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', js)(mod, mod.exports);
  return mod.exports[exportName];
}

function flatten(object, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

const placeholders = (text) =>
  [...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
    .map((m) => m[1])
    .sort()
    .join(',');
const pt = flatten(load('src/i18n/locales/pt.ts', 'pt'));
const en = flatten(load('src/i18n/locales/en.ts', 'en'));

// Nomes de idiomas e marcas ficam iguais de propósito.
const SAME_ON_PURPOSE = /^(settings\.language|brand\.)/;
const problems = [];
for (const key of Object.keys(pt)) {
  if (!(key in en)) problems.push(`falta em en: ${key}`);
}
for (const key of Object.keys(en)) {
  if (!(key in pt)) problems.push(`sobra em en: ${key}`);
}
for (const key of Object.keys(pt)) {
  if (!(key in en)) continue;
  if (typeof pt[key] !== 'string' || typeof en[key] !== 'string') {
    problems.push(`tipo diferente: ${key}`);
    continue;
  }
  if (!pt[key].trim() || !en[key].trim()) problems.push(`texto vazio: ${key}`);
  if (placeholders(pt[key]) !== placeholders(en[key])) {
    problems.push(
      `placeholders diferentes: ${key}  pt={${placeholders(pt[key])}} en={${placeholders(en[key])}}`,
    );
  }
  if (
    pt[key] === en[key] &&
    !SAME_ON_PURPOSE.test(key) &&
    /[a-zà-ú]{4,}/i.test(pt[key]) &&
    !/^[\p{Extended_Pictographic}\s{}\w.:/-]+$/u.test(pt[key])
  ) {
    problems.push(`igual nos dois idiomas (talvez sem traduzir): ${key} = "${pt[key]}"`);
  }
}
console.log(`${Object.keys(pt).length} textos em pt, ${Object.keys(en).length} em en.`);
if (problems.length === 0) console.log('Tudo certo: mesmas chaves, mesmos placeholders.');
else {
  console.log(`${problems.length} ponto(s) para olhar:`);
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
}
