/* O que pede atenção hoje, em ordem de urgência. É o coração da tela "Hoje":
   em vez de 34 abas para conferir, o sistema junta as pendências e diz o próximo passo. */
(function (root, factory) {
  var req = typeof require === 'function';
  var api = factory(root.Datas || (req ? require('./datas.js') : null), root.Pedidos || (req ? require('./pedidos.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Atencao = api;
})(typeof self !== 'undefined' ? self : this, function (Datas, Pedidos) {
  'use strict';
  // Peso por nível: atrasado > hoje > em breve > oportunidade.
  var PESO = { critico: 400, hoje: 300, breve: 200, oportunidade: 100 };

  function listar(d, hoje) {
    var nome = {};
    d.clientes.forEach(function (c) { nome[c.id] = c; });
    var out = [];

    d.pedidos.forEach(function (p) {
      if (p.etapa === 'entregue') return;
      var s = Pedidos.situacao(p, hoje);
      var c = nome[p.clienteId] || {};
      if (s.nivel === 'atrasado') out.push({ id: 'ped-' + p.id, nivel: 'critico', tipo: 'pedido', ref: p.id, titulo: 'Pedido ' + p.numero + ' atrasado', detalhe: c.nome + ' · ' + Pedidos.nomeEtapa(p.tipo, p.etapa).toLowerCase() + ' · ' + s.texto.toLowerCase(), acao: 'Ver pedido', ordem: Datas.diferencaDias(p.prazo, hoje) });
      else if (p.etapa === 'pronto') out.push({ id: 'ret-' + p.id, nivel: 'hoje', tipo: 'retirada', ref: p.id, titulo: 'Pronto para retirar: ' + c.nome, detalhe: p.descricao, acao: 'Avisar cliente', ordem: 0 });
      else if (s.nivel === 'atencao') out.push({ id: 'ped-' + p.id, nivel: 'hoje', tipo: 'pedido', ref: p.id, titulo: 'Pedido ' + p.numero + ': ' + s.texto.toLowerCase(), detalhe: c.nome + ' · ' + Pedidos.nomeEtapa(p.tipo, p.etapa).toLowerCase(), acao: 'Ver pedido', ordem: 0 });
    });

    d.financeiro.forEach(function (f) {
      if (f.tipo !== 'receber' || f.status !== 'aberto') return;
      var dd = Datas.diferencaDias(hoje, f.vencimento);
      var c = nome[f.clienteId] || {};
      if (dd < 0) out.push({ id: 'fin-' + f.id, nivel: 'critico', tipo: 'cobranca', ref: f.id, clienteId: f.clienteId, valor: f.valorCentavos, titulo: 'Parcela vencida: ' + c.nome, detalhe: f.descricao + ' · venceu ' + Datas.relativo(f.vencimento, hoje), acao: 'Cobrar', ordem: -dd });
      else if (dd === 0) out.push({ id: 'fin-' + f.id, nivel: 'hoje', tipo: 'cobranca', ref: f.id, clienteId: f.clienteId, valor: f.valorCentavos, titulo: 'Parcela vence hoje: ' + c.nome, detalhe: f.descricao, acao: 'Lembrar', ordem: 0 });
    });

    d.orcamentos.forEach(function (q) {
      if (q.status !== 'aberto') return;
      var dd = Datas.diferencaDias(hoje, q.validade);
      var c = nome[q.clienteId] || {};
      if (dd >= 0 && dd <= 2) out.push({ id: 'orc-' + q.id, nivel: 'breve', tipo: 'orcamento', ref: q.id, clienteId: q.clienteId, titulo: 'Orçamento expira ' + Datas.relativo(q.validade, hoje) + ': ' + c.nome, detalhe: 'Orçamento ' + q.numero, acao: 'Retomar', ordem: dd });
    });

    d.clientes.forEach(function (c) {
      if (c.nascimento) {
        var a = Datas.diasAteAniversario(c.nascimento, hoje);
        if (a <= 3) out.push({ id: 'niver-' + c.id, nivel: a === 0 ? 'hoje' : 'oportunidade', tipo: 'aniversario', ref: c.id, clienteId: c.id, titulo: a === 0 ? 'Aniversário hoje: ' + c.nome : 'Aniversário ' + Datas.relativo(Datas.somarDias(hoje, a), hoje) + ': ' + c.nome, detalhe: 'Bom momento para uma mensagem', acao: 'Parabenizar', ordem: a });
      }
      if (c.receita) {
        var r = Datas.diferencaDias(hoje, c.receita.validade);
        if (r >= -30 && r <= 15) out.push({ id: 'rec-' + c.id, nivel: 'oportunidade', tipo: 'receita', ref: c.id, clienteId: c.id, titulo: (r < 0 ? 'Receita vencida: ' : 'Receita vence ' + Datas.relativo(c.receita.validade, hoje) + ': ') + c.nome, detalhe: r < 0 ? 'Venceu ' + Datas.relativo(c.receita.validade, hoje) + '. Oferecer novo exame' : 'Oferecer renovação e lentes novas', acao: 'Oferecer exame', ordem: r });
      }
    });

    d.produtos.forEach(function (p) {
      if (p.estoque == null || p.encomenda || p.laboratorio || !p.minimo) return;
      if (p.estoque < p.minimo) out.push({ id: 'est-' + p.id, nivel: 'breve', tipo: 'estoque', ref: p.id, titulo: 'Estoque baixo: ' + p.nome, detalhe: p.estoque + (p.estoque === 1 ? ' unidade' : ' unidades') + ' · mínimo ' + p.minimo, acao: 'Ver produto', ordem: p.estoque - p.minimo });
    });

    return out.sort(function (a, b) { return (PESO[b.nivel] - PESO[a.nivel]) || (b.ordem - a.ordem); });
  }

  function contar(lista) {
    return lista.filter(function (i) { return i.nivel === 'critico' || i.nivel === 'hoje'; }).length;
  }

  return { listar: listar, contar: contar };
});
