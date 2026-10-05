/* Etapas de pedido por tipo de trabalho. O sistema antigo tinha uma única esteira de ótica
   ("aguardando lente", "montagem") aplicada a tudo; joia em reparo não passa por laboratório. */
(function (root, factory) {
  var api = factory(root.Datas || (typeof require === 'function' ? require('./datas.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Pedidos = api;
})(typeof self !== 'undefined' ? self : this, function (Datas) {
  'use strict';
  var FLUXOS = {
    otica: {
      nome: 'Óculos de grau',
      etapas: [
        { id: 'recebido', nome: 'Recebido' },
        { id: 'laboratorio', nome: 'No laboratório' },
        { id: 'montagem', nome: 'Montagem' },
        { id: 'conferencia', nome: 'Conferência' },
        { id: 'pronto', nome: 'Pronto p/ retirar' },
        { id: 'entregue', nome: 'Entregue' }
      ]
    },
    joia: {
      nome: 'Serviço de joalheria',
      etapas: [
        { id: 'recebido', nome: 'Recebido' },
        { id: 'avaliacao', nome: 'Avaliação' },
        { id: 'aprovado', nome: 'Aprovado' },
        { id: 'execucao', nome: 'Na bancada' },
        { id: 'pronto', nome: 'Pronto p/ retirar' },
        { id: 'entregue', nome: 'Entregue' }
      ]
    }
  };

  function etapas(tipo) { return FLUXOS[tipo].etapas; }

  function indice(tipo, etapa) {
    var e = etapas(tipo);
    for (var i = 0; i < e.length; i++) if (e[i].id === etapa) return i;
    return -1;
  }

  function proxima(tipo, etapa) {
    var e = etapas(tipo), i = indice(tipo, etapa);
    return i >= 0 && i < e.length - 1 ? e[i + 1] : null;
  }

  function anterior(tipo, etapa) {
    var e = etapas(tipo), i = indice(tipo, etapa);
    return i > 0 ? e[i - 1] : null;
  }

  function nomeEtapa(tipo, etapa) {
    var i = indice(tipo, etapa);
    return i >= 0 ? etapas(tipo)[i].nome : etapa;
  }

  /* Situação pelo prazo: entregue não atrasa; pronto também não (já está com a loja). */
  function situacao(pedido, hoje) {
    if (pedido.etapa === 'entregue') return { nivel: 'ok', texto: 'Entregue' };
    if (pedido.etapa === 'pronto') return { nivel: 'pronto', texto: 'Aguardando retirada' };
    var d = Datas.diferencaDias(hoje, pedido.prazo);
    if (d < 0) return { nivel: 'atrasado', texto: 'Atrasado ' + Math.abs(d) + (Math.abs(d) === 1 ? ' dia' : ' dias') };
    if (d <= 1) return { nivel: 'atencao', texto: d === 0 ? 'Vence hoje' : 'Vence amanhã' };
    return { nivel: 'ok', texto: 'Prazo ' + Datas.curta(pedido.prazo) };
  }

  /* Progresso de 0 a 1, para a barrinha do cartão. */
  function progresso(tipo, etapa) {
    var n = etapas(tipo).length - 1;
    return Math.max(0, indice(tipo, etapa)) / n;
  }

  return { FLUXOS: FLUXOS, etapas: etapas, indice: indice, proxima: proxima, anterior: anterior, nomeEtapa: nomeEtapa, situacao: situacao, progresso: progresso };
});
