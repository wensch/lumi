// Contraste (WCAG 2.2) dos pares de cores do tema do Lumi, nas 4 paletas.
// Uso (na raiz do repositório): node .claude/skills/acessibilidade/contraste.mjs
// Texto normal precisa de 4,5:1; texto grande (≥ 24 px, ou ≥ 19 px em negrito) e bordas/ícones, 3:1.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const source = readFileSync('src/theme/palettes.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: 'CommonJS', target: 'ES2020' },
}).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const palettes = mod.exports.palettes;

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [texto, fundo, uso]
const PAIRS = [
  ['ink', 'bg', 'texto principal na tela'],
  ['ink', 'white', 'texto principal em cartão'],
  ['ink', 'green', 'texto em botão/cartão verde'],
  ['ink', 'yellow', 'texto em cartão destaque (amarelo)'],
  ['ink', 'blue', 'texto em botão azul'],
  ['ink', 'pink', 'texto em cartão rosa'],
  ['muted', 'bg', 'texto secundário na tela'],
  ['muted', 'white', 'texto secundário em cartão'],
  ['muted', 'yellow', 'texto secundário no cartão amarelo'],
  ['danger', 'white', 'erro em cartão'],
  ['danger', 'bg', 'erro na tela'],
  ['white', 'danger', 'número no selo vermelho'],
];

let fails = 0;
for (const palette of Object.values(palettes)) {
  console.log(`\n== ${palette.name}${palette.isDark ? ' (escura)' : ''}`);
  for (const [fg, bg, use] of PAIRS) {
    const value = ratio(palette[fg], palette[bg]);
    const status = value >= 4.5 ? 'ok   ' : value >= 3 ? 'só grande' : 'FALHA';
    if (value < 4.5) fails += 1;
    console.log(`${status}  ${value.toFixed(2).padStart(5)}:1  ${fg} em ${bg} — ${use}`);
  }
}
console.log(`\n${fails} par(es) abaixo de 4,5:1 (texto normal).`);
