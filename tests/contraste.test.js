'use strict';
/* Contraste AA (4,5:1) dos pares de texto do design system, nos dois temas.
   Lê os tokens direto do CSS: se alguém mudar uma cor, o teste avisa. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const css = fs.readFileSync(__dirname + '/../css/styles.css', 'utf8');

function tokens(bloco) {
  const o = {};
  for (const m of bloco.matchAll(/--([\w-]+):\s*([^;]+);/g)) o[m[1]] = m[2].trim();
  return o;
}
const escuro = tokens(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: light)')));
const claro = Object.assign({}, escuro, tokens(css.slice(css.indexOf(':root[data-theme="light"]'), css.indexOf(':root[data-theme="dark"]'))));

function rgb(c) {
  let m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = c.match(/rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
  if (m) return [+m[1], +m[2], +m[3], +m[4]];
  throw new Error('cor não entendida: ' + c);
}
function sobre(frente, fundo) { const a = frente[3]; return [0, 1, 2].map(i => frente[i] * a + fundo[i] * (1 - a)).concat(1); }
function lum(c) { return c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
function razao(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

const PARES = [
  ['fg', 'bg'], ['fg', 'surface'], ['fg-2', 'surface'], ['muted', 'surface'], ['muted', 'bg'], ['muted', 'surface-2'],
  ['ouro-texto', 'surface'], ['sobre-ouro', 'ouro'], ['safira-texto', 'surface'], ['ametista-texto', 'surface'],
  ['esmeralda-texto', 'surface'], ['citrino-texto', 'surface'], ['rubi-texto', 'surface'],
  // pílulas: texto sobre o fundo translúcido da própria cor
  ['safira-texto', 'safira-fundo'], ['ametista-texto', 'ametista-fundo'], ['esmeralda-texto', 'esmeralda-fundo'],
  ['citrino-texto', 'citrino-fundo'], ['rubi-texto', 'rubi-fundo'], ['ouro-texto', 'ouro-fundo']
];

for (const [nome, t] of [['escuro', escuro], ['claro', claro]]) {
  test(`contraste AA no tema ${nome}`, () => {
    const ruins = [];
    for (const [f, b] of PARES) {
      const base = rgb(t.surface);
      const fundo = sobre(rgb(t[b]), base);
      const r = razao(rgb(t[f]), fundo);
      if (r < 4.5) ruins.push(`${f} sobre ${b}: ${r.toFixed(2)}:1`);
    }
    assert.deepEqual(ruins, []);
  });
}
