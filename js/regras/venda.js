/* Regras da venda: total, desconto, pagamento dividido, troco e parcelas.
   Tudo em centavos. A tela só mostra o que esta função devolve. */
(function (root, factory) {
  var api = factory(root.Dinheiro || (typeof require === 'function' ? require('./dinheiro.js') : null),
                    root.Datas || (typeof require === 'function' ? require('./datas.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Venda = api;
})(typeof self !== 'undefined' ? self : this, function (Dinheiro, Datas) {
  'use strict';

  /* itens: [{ precoCentavos, qtd }]; desconto: { tipo: 'valor'|'pct', valor } */
  function calcular(itens, desconto) {
    var subtotal = itens.reduce(function (s, i) { return s + i.precoCentavos * i.qtd; }, 0);
    var d = 0;
    if (desconto && desconto.valor > 0) {
      d = desconto.tipo === 'pct' ? Dinheiro.percentual(subtotal, Math.min(desconto.valor, 100)) : desconto.valor;
    }
    d = Math.min(Math.max(d, 0), subtotal); // desconto nunca deixa total negativo
    var pecas = itens.reduce(function (s, i) { return s + i.qtd; }, 0);
    return { subtotal: subtotal, desconto: d, total: subtotal - d, pecas: pecas };
  }

  /* pagamentos: [{ forma, valor, parcelas }]. Só dinheiro pode passar do total (gera troco). */
  function conferirPagamentos(total, pagamentos) {
    var pago = 0, dinheiro = 0, erros = [];
    pagamentos.forEach(function (p) {
      if (!(p.valor > 0)) return;
      pago += p.valor;
      if (p.forma === 'dinheiro') dinheiro += p.valor;
    });
    var excesso = Math.max(pago - total, 0);
    var troco = Math.min(excesso, dinheiro);
    if (excesso > troco) erros.push('Pagamento passa do total em ' + Dinheiro.formatar(excesso - troco) + '. Só dinheiro gera troco.');
    var falta = Math.max(total - pago, 0);
    return { pago: pago, falta: falta, troco: troco, fechado: falta === 0 && !erros.length && total > 0, erros: erros };
  }

  /* Crediário/cartão: gera parcelas mensais a partir da primeira data. */
  function parcelas(valor, quantidade, primeiraData) {
    return Dinheiro.dividir(valor, quantidade).map(function (v, i) {
      return { numero: i + 1, de: quantidade, valor: v, vencimento: Datas.somarMeses(primeiraData, i) };
    });
  }

  /* Quanto ainda precisa entrar se o operador escolher outra forma: preenche o restante automaticamente. */
  function sugerirValor(total, pagamentos) {
    return conferirPagamentos(total, pagamentos).falta;
  }

  return { calcular: calcular, conferirPagamentos: conferirPagamentos, parcelas: parcelas, sugerirValor: sugerirValor };
});
