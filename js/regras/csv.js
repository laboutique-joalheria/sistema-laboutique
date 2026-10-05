/* CSV seguro para abrir no Excel: separador ";" (padrão BR), BOM para acento,
   e neutralização de fórmula (=, +, -, @) — o exportador antigo não fazia isso. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Csv = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function celula(v) {
    var t = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+([.,]\d+)?$/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  }
  function gerar(linhas) {
    return '﻿' + linhas.map(function (l) { return l.map(celula).join(';'); }).join('\r\n');
  }
  return { celula: celula, gerar: gerar };
});
