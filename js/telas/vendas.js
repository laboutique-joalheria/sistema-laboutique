/* VENDAS: histórico por dia e orçamentos que viram venda sem redigitar. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic, R$ = L.R$;
  var periodo = 7;

  function aba() { return L.E.param === 'orcamentos' ? 'orcamentos' : 'vendas'; }

  function listaVendas() {
    var desde = Datas.somarDias(L.hoje, -(periodo - 1));
    var vs = L.D.vendas.filter(function (v) { return v.dia >= desde; }).sort(function (a, b) { return (b.dia + b.hora) < (a.dia + a.hora) ? -1 : 1; });
    var total = vs.reduce(function (s, v) { return s + v.totalCentavos; }, 0);
    var porDia = {};
    vs.forEach(function (v) { (porDia[v.dia] = porDia[v.dia] || []).push(v); });
    var chips = [[1, 'Hoje'], [7, '7 dias'], [30, '30 dias']].map(function (p) { return '<button class="chip" data-periodo="' + p[0] + '" aria-pressed="' + (periodo === p[0]) + '">' + p[1] + '</button>'; }).join('');
    var resumo = '<div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
      '<div class="kpi ouro"><span class="rotulo">' + ic('vendas') + 'Vendido</span><span class="valor" data-contar="' + total + '" data-formato="moeda">' + R$(total) + '</span><span class="nota">' + (periodo === 1 ? 'hoje' : 'nos últimos ' + periodo + ' dias') + '</span></div>' +
      '<div class="kpi safira"><span class="rotulo">' + ic('doc') + 'Vendas</span><span class="valor">' + vs.length + '</span><span class="nota">' + Object.keys(porDia).length + ' dias com venda</span></div>' +
      '<div class="kpi ametista"><span class="rotulo">' + ic('moeda') + 'Ticket médio</span><span class="valor">' + R$(vs.length ? Math.round(total / vs.length) : 0) + '</span><span class="nota">por venda</span></div></div>';
    var grupos = Object.keys(porDia).map(function (d) {
      var lista = porDia[d], t = lista.reduce(function (s, v) { return s + v.totalCentavos; }, 0);
      return '<section class="painel" style="margin-bottom:12px"><div class="painel-topo"><h2>' + esc(Datas.porExtenso(d)) + (d === L.hoje ? ' · hoje' : '') + '</h2><span class="num" style="font-weight:800">' + R$(t) + ' <span class="muted" style="font-weight:600">· ' + lista.length + '</span></span></div><ul class="lista">' +
        lista.map(function (v) {
          var c = v.clienteId && L.cli(v.clienteId);
          var itens = v.itens.map(function (i) { return (i.qtd > 1 ? i.qtd + '× ' : '') + (L.prod(i.produtoId) || {}).nome; }).join(', ');
          var formas = v.pagamentos.map(function (p) { return L.FORMAS[p.forma].nome + (p.parcelas > 1 ? ' ' + p.parcelas + '×' : ''); }).join(' + ');
          return '<li><button class="lista-linha" data-venda="' + v.id + '"><span class="mono muted" style="font-size:var(--fs-sm)">' + esc(v.hora) + '</span>' +
            '<span style="min-width:0"><strong>' + esc(c ? c.nome : 'Consumidor final') + '</strong><small>' + esc(itens) + '</small></span>' +
            '<span class="some-medio"><small>' + esc(formas) + '</small><small class="mono">#' + v.numero + ' · ' + esc(L.primeiroNome((L.usuario(v.vendedorId) || {}).nome)) + '</small></span>' +
            '<span class="direita"><strong class="num">' + R$(v.totalCentavos) + '</strong></span>' + ic('dir') + '</button></li>';
        }).join('') + '</ul></section>';
    }).join('');
    return '<div class="chips" style="margin-bottom:16px">' + chips + '</div>' + resumo + (grupos || '<div class="painel vazio"><h3>Nenhuma venda no período</h3><p>Use o botão Vender para registrar a primeira.</p></div>');
  }

  function listaOrcamentos() {
    var qs = L.D.orcamentos.slice().sort(function (a, b) { return a.status === b.status ? (a.validade < b.validade ? -1 : 1) : a.status === 'aberto' ? -1 : 1; });
    if (!qs.length) return '<div class="painel vazio"><h3>Nenhum orçamento</h3></div>';
    return '<section class="painel"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Nº</th><th>Cliente</th><th>Itens</th><th>Validade</th><th class="valor">Total</th><th></th></tr></thead><tbody>' +
      qs.map(function (q) {
        var c = q.clienteId && L.cli(q.clienteId);
        var total = Venda.calcular(q.itens, q.descontoCentavos ? { tipo: 'valor', valor: q.descontoCentavos } : null).total;
        var d = Datas.diferencaDias(L.hoje, q.validade);
        var sit = q.status === 'convertido' ? L.pilula('ok', 'Virou venda', 'check') : d < 0 ? L.pilula('atrasado', 'Expirou ' + Datas.relativo(q.validade, L.hoje)) : d <= 2 ? L.pilula('atencao', 'Vence ' + Datas.relativo(q.validade, L.hoje)) : L.pilula('info', 'Até ' + Datas.curta(q.validade));
        var msg = 'Olá, ' + (c ? L.primeiroNome(c.nome) : '') + '! Seu orçamento ' + q.numero + ' na ' + L.D.loja.nome + ' ficou em ' + R$(total) + '. Vale até ' + Datas.curta(q.validade) + '. Posso confirmar?';
        return '<tr class="' + (q.status === 'convertido' ? 'feito' : '') + '"><td class="mono">' + q.numero + '</td><td><strong>' + esc(c ? c.nome : 'Sem cliente') + '</strong><small>' + esc(q.notas || '') + '</small></td>' +
          '<td>' + esc(q.itens.map(function (i) { return (L.prod(i.produtoId) || {}).nome; }).join(', ')) + '</td><td>' + sit + '</td><td class="valor"><strong>' + R$(total) + '</strong></td>' +
          '<td style="white-space:nowrap">' + (q.status === 'aberto' ? '<div style="display:flex;gap:6px;justify-content:flex-end"><a class="btn sm icone" href="' + L.wa(msg, c) + '" target="_blank" rel="noopener" data-wa aria-label="Enviar pelo WhatsApp">' + ic('whats') + '</a><button class="btn sm ouro" data-converter="' + q.id + '">Converter em venda</button></div>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }

  L.telas.vendas = {
    titulo: 'Vendas',
    html: function () {
      var abertos = L.D.orcamentos.filter(function (q) { return q.status === 'aberto'; }).length;
      return '<div class="cabeca"><div><h1>Vendas</h1><p>O que foi vendido, por quem e como foi pago. Orçamentos viram venda com um toque.</p></div>' +
        '<div class="cabeca-acoes"><button class="btn" data-acao="orcamento">' + ic('doc') + 'Novo orçamento</button><button class="btn ouro" data-acao="vender">' + ic('vendas') + 'Vender</button></div></div>' +
        '<div class="abas" role="tablist" style="margin-bottom:20px;max-width:max-content"><button class="aba" role="tab" data-aba-vendas="vendas" aria-selected="' + (aba() === 'vendas') + '">Vendas</button><button class="aba" role="tab" data-aba-vendas="orcamentos" aria-selected="' + (aba() === 'orcamentos') + '">Orçamentos<span class="cont">' + abertos + '</span></button></div>' +
        (aba() === 'vendas' ? listaVendas() : listaOrcamentos());
    }
  };

  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-aba-vendas]'))) { L.ir('vendas', t.dataset.abaVendas === 'orcamentos' ? 'orcamentos' : null, { som: false }); Som.tocar('clique'); return; }
    if ((t = e.target.closest('[data-periodo]'))) { periodo = Number(t.dataset.periodo); L.atualizar(); Motion.contar(L.$('#vista'), L.R$); return; }
    if ((t = e.target.closest('[data-converter]'))) { L.abrirVenda({ orcamentoId: t.dataset.converter }); return; }
    if ((t = e.target.closest('[data-venda]'))) { var v = L.D.vendas.find(function (x) { return x.id === t.dataset.venda; }); if (v) L.verRecibo(v); }
  });
})(L);
