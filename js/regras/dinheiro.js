/* Dinheiro sempre em centavos inteiros: soma de float (0,1 + 0,2) erra centavo e fecha caixa errado. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Dinheiro = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function formatar(centavos) {
    // Intl usa espaço não separável; trocar evita quebra estranha em teste e cópia.
    return fmt.format((Number(centavos) || 0) / 100).replace(/ /g, ' ');
  }

  /* Aceita "1.234,56", "1234,5", "1234.56", "R$ 12" e número. Devolve null se não der para entender. */
  function lerReais(entrada) {
    if (typeof entrada === 'number') return Number.isFinite(entrada) ? Math.round(entrada * 100) : null;
    var t = String(entrada == null ? '' : entrada).replace(/[R$\s\u00a0]/g, '');
    var negativo = /^-/.test(t);
    t = t.replace(/^[-+]/, '');
    if (!t) return null;
    if (t.indexOf(',') >= 0) {
      // Padrão brasileiro: ponto é milhar, vírgula é decimal.
      t = t.replace(/\./g, '').replace(',', '.');
    } else {
      var pontos = t.split('.').length - 1;
      var depois = t.length - t.lastIndexOf('.') - 1;
      // "1234.56" é decimal; "1.234" e "1.234.567" são milhar.
      if (!(pontos === 1 && depois <= 2)) t = t.replace(/\./g, '');
    }
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
    var partes = t.split('.');
    var c = Number(partes[0]) * 100 + Number(((partes[1] || '') + '00').slice(0, 2));
    return negativo ? -c : c;
  }

  /* Divide o total em n parcelas sem perder centavo: a sobra vai nas primeiras. */
  function dividir(total, n) {
    n = Math.max(1, Math.floor(n));
    var base = Math.floor(total / n), sobra = total - base * n, out = [];
    for (var i = 0; i < n; i++) out.push(base + (i < sobra ? 1 : 0));
    return out;
  }

  function percentual(total, pct) {
    return Math.round(total * pct / 100);
  }

  return { formatar: formatar, lerReais: lerReais, dividir: dividir, percentual: percentual };
});
