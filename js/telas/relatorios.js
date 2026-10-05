/* RELATÓRIOS como perguntas de dono de loja, não como tabelas de banco de dados. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic, R$ = L.R$;
  var DIAS = 30;

  function periodo() {
    var desde = Datas.somarDias(L.hoje, -(DIAS - 1));
    return L.D.vendas.filter(function (v) { return v.dia >= desde; });
  }

  function barrasDias(vs) {
    var dias = [];
    for (var i = DIAS - 1; i >= 0; i--) dias.push(Datas.somarDias(L.hoje, -i));
    var tot = dias.map(function (d) { return vs.filter(function (v) { return v.dia === d; }).reduce(function (s, v) { return s + v.totalCentavos; }, 0); });
    var max = Math.max.apply(null, tot.concat([1])), media = tot.reduce(function (a, b) { return a + b; }, 0) / DIAS;
    var W = 760, H = 200, base = 168, topo = 16, passo = W / DIAS, larg = passo * 0.62;
    var esc2 = (base - topo) / max;
    var barras = tot.map(function (v, i) {
      var h = v * esc2, x = i * passo + (passo - larg) / 2, ehHoje = i === DIAS - 1;
      var dow = Datas.diaDaSemana(dias[i]);
      return (h ? '<rect class="coluna-barra" style="--i:' + i + '" x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + larg.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + (ehHoje ? 'var(--ouro)' : 'var(--safira)') + '" fill-opacity="' + (ehHoje ? 1 : 0.75) + '"><title>' + Datas.curta(dias[i]) + ': ' + R$(v) + '</title></rect>' : '') +
        (dow === 1 || ehHoje ? '<text x="' + (x + larg / 2).toFixed(1) + '" y="' + (base + 18) + '" text-anchor="middle" font-size="11" fill="' + (ehHoje ? 'var(--fg)' : 'var(--muted)') + '" font-weight="' + (ehHoje ? 800 : 600) + '">' + (ehHoje ? 'hoje' : Datas.curta(dias[i])) + '</text>' : '');
    }).join('');
    var yM = base - media * esc2;
    return '<svg viewBox="0 0 ' + W + ' ' + (H + 8) + '" style="width:100%;height:auto;overflow:visible" role="img" aria-label="Vendas por dia nos últimos 30 dias">' +
      '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" stroke="var(--line-strong)"/>' +
      '<line x1="0" x2="' + W + '" y1="' + yM.toFixed(1) + '" y2="' + yM.toFixed(1) + '" stroke="var(--ouro)" stroke-dasharray="4 5" stroke-opacity=".8"/>' +
      '<text x="' + (W - 4) + '" y="' + (yM - 6).toFixed(1) + '" text-anchor="end" font-size="11" font-weight="700" fill="var(--ouro-texto)">média ' + esc(R$(Math.round(media)).replace(',00', '')) + '/dia</text>' + barras + '</svg>';
  }

  function rosca(partes) {
    var soma = partes.reduce(function (s, p) { return s + p.valor; }, 0);
    if (!soma) return '<p class="muted">Sem vendas no período.</p>';
    var total = soma;
    var r = 52, C = 2 * Math.PI * r, acum = 0;
    // Fatia zero não desenha arco (dasharray negativo faria o navegador pintar o anel inteiro).
    var arcos = partes.filter(function (p) { return p.valor > 0; }).map(function (p) {
      var frac = p.valor / total, seg = '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + p.cor + '" stroke-width="20" stroke-dasharray="' + Math.max(0, frac * C - 2).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-acum * C).toFixed(2) + '" transform="rotate(-90 70 70)"/>';
      acum += frac; return seg;
    }).join('');
    var maior = partes.slice().sort(function (a, b) { return b.valor - a.valor; })[0];
    return '<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap"><svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="Divisão do faturamento"><circle cx="70" cy="70" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="20"/>' + arcos +
      '<text x="70" y="68" text-anchor="middle" font-size="20" font-weight="800" fill="var(--fg)">' + Math.round(maior.valor / total * 100) + '%</text><text x="70" y="86" text-anchor="middle" font-size="10" fill="var(--muted)">' + esc(maior.nome.toLowerCase()) + '</text></svg>' +
      '<div style="display:grid;gap:10px;flex:1;min-width:160px">' + partes.map(function (p) { return '<div style="display:flex;justify-content:space-between;gap:12px"><span><i style="display:inline-block;width:10px;height:10px;transform:rotate(45deg);background:' + p.cor + ';margin-right:8px"></i>' + esc(p.nome) + '</span><span class="num"><strong>' + R$(p.valor) + '</strong> <span class="muted">' + Math.round(p.valor / total * 100) + '%</span></span></div>'; }).join('') + '</div></div>';
  }

  function barrasH(linhas, cor) {
    var max = Math.max.apply(null, linhas.map(function (l) { return l.valor; }).concat([1]));
    return '<div class="barras-h">' + linhas.map(function (l, i) {
      return '<div class="barra-h" style="--i:' + i + '"><span class="nome">' + esc(l.nome) + '</span><span class="trilha"><span style="width:' + (l.valor / max * 100).toFixed(1) + '%;--cor:' + (l.cor || cor) + '"></span></span><b>' + esc(l.texto || R$(l.valor)) + '</b></div>';
    }).join('') + '</div>';
  }

  L.telas.relatorios = {
    titulo: 'Relatórios',
    html: function () {
      var vs = periodo();
      var total = vs.reduce(function (s, v) { return s + v.totalCentavos; }, 0);
      var seg = { joia: 0, otica: 0, servico: 0 }, prods = {}, vend = {}, formas = {};
      vs.forEach(function (v) {
        v.itens.forEach(function (i) { var p = L.prod(i.produtoId); if (!p) return; seg[p.segmento] += i.precoCentavos * i.qtd; prods[p.id] = (prods[p.id] || 0) + i.precoCentavos * i.qtd; });
        var u = L.usuario(v.vendedorId); var k = u ? u.nome : '—';
        vend[k] = vend[k] || { valor: 0, n: 0 }; vend[k].valor += v.totalCentavos; vend[k].n++;
        v.pagamentos.forEach(function (p) { formas[p.forma] = (formas[p.forma] || 0) + p.valor; });
      });
      var top = Object.keys(prods).map(function (id) { return { nome: L.prod(id).nome, valor: prods[id], cor: L.prod(id).segmento === 'otica' ? 'var(--safira)' : L.prod(id).segmento === 'joia' ? 'var(--ametista)' : 'var(--ouro)' }; }).sort(function (a, b) { return b.valor - a.valor; }).slice(0, 6);
      var vendedores = Object.keys(vend).map(function (k) { return { nome: k, valor: vend[k].valor, texto: R$(vend[k].valor) + ' · ' + vend[k].n }; }).sort(function (a, b) { return b.valor - a.valor; });
      var totalFormas = Object.keys(formas).reduce(function (s, k) { return s + formas[k]; }, 0) || 1;
      var pagam = Object.keys(formas).map(function (k) { return { nome: L.FORMAS[k].nome, valor: formas[k], texto: Math.round(formas[k] / totalFormas * 100) + '%' }; }).sort(function (a, b) { return b.valor - a.valor; });
      var sumidos = L.D.clientes.filter(function (c) { var s = L.stats(c.id); return !s.ultima || Datas.diferencaDias(s.ultima, L.hoje) > 60; }).slice(0, 5);
      var melhor = vendedores[0];

      return '<div class="cabeca"><div><h1>Relatórios</h1><p>Respostas diretas sobre os últimos ' + DIAS + ' dias. Passe o mouse nas barras para ver o valor do dia.</p></div>' +
        '<div class="cabeca-acoes"><button class="btn" data-exportar-csv>' + ic(L.emQuadro ? 'copiar' : 'baixar') + (L.emQuadro ? 'Copiar CSV' : 'Exportar CSV') + '</button></div></div>' +
        '<div class="perguntas">' +
          '<section class="painel pergunta larga rolagem-3d" data-revelar><div class="painel-corpo" style="display:grid;gap:12px"><h2>Quanto vendi nos últimos ' + DIAS + ' dias?</h2><p class="resposta" data-contar="' + total + '" data-formato="moeda">' + R$(total) + '</p><p class="muted">' + vs.length + ' vendas · ticket médio ' + R$(vs.length ? Math.round(total / vs.length) : 0) + '</p>' + barrasDias(vs) + '</div></section>' +
          '<section class="painel pergunta rolagem-3d" data-revelar><div class="painel-corpo" style="display:grid;gap:16px"><h2>Joias ou ótica: o que pesa mais?</h2>' + rosca([{ nome: 'Joias', valor: seg.joia, cor: 'var(--ametista)' }, { nome: 'Ótica', valor: seg.otica, cor: 'var(--safira)' }, { nome: 'Serviços', valor: seg.servico, cor: 'var(--ouro)' }]) + '</div></section>' +
          '<section class="painel pergunta rolagem-3d" data-revelar><div class="painel-corpo" style="display:grid;gap:16px"><h2>O que mais vende?</h2>' + barrasH(top) + '</div></section>' +
          '<section class="painel pergunta rolagem-3d" data-revelar><div class="painel-corpo" style="display:grid;gap:16px"><h2>Quem vendeu mais?</h2>' + (melhor ? '<p class="muted">' + esc(melhor.nome) + ' lidera com ' + R$(melhor.valor) + '.</p>' : '') + barrasH(vendedores, 'var(--ouro)') + '</div></section>' +
          '<section class="painel pergunta rolagem-3d" data-revelar><div class="painel-corpo" style="display:grid;gap:16px"><h2>Como os clientes pagam?</h2>' + barrasH(pagam, 'var(--esmeralda)') + '</div></section>' +
          '<section class="painel pergunta larga rolagem-3d" data-revelar><div class="painel-corpo" style="display:grid;gap:12px"><h2>Quem anda sumido?</h2><p class="muted">Clientes sem compra há mais de 60 dias. Um contato agora pode virar venda.</p>' +
            (sumidos.length ? '<ul class="atencao-lista" style="padding:0">' + sumidos.map(function (c) { var s = L.stats(c.id); return '<li class="atencao-item oportunidade">' + L.avatar(c) + '<div style="min-width:0"><strong>' + esc(c.nome) + '</strong><small>' + (s.ultima ? 'Última compra ' + Datas.relativo(s.ultima, L.hoje) : 'Ainda não comprou') + '</small></div>' + L.linkWa('Olá, ' + L.primeiroNome(c.nome) + '! Faz tempo que não te vemos na ' + L.D.loja.nome + '. Chegaram novidades que combinam com você. Quer que eu separe algumas para ver?', 'Chamar', 'sm', c) + '</li>'; }).join('') + '</ul>' : '<p>Ninguém sumido. Ótimo sinal.</p>') + '</div></section>' +
        '</div>';
    },
    depois: function () {
      // Garante as barras visíveis mesmo se o observador não disparar (ex.: captura de tela).
      setTimeout(function () { L.$$('[data-revelar]').forEach(function (el) { el.classList.add('revelado'); }); }, 2500);
    }
  };

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-exportar-csv]')) return;
    var vs = periodo().slice().sort(function (a, b) { return a.dia + a.hora < b.dia + b.hora ? -1 : 1; });
    var linhas = [['Venda', 'Data', 'Hora', 'Cliente', 'Vendedor', 'Itens', 'Desconto', 'Total', 'Pagamento']].concat(vs.map(function (v) {
      var c = v.clienteId && L.cli(v.clienteId), u = L.usuario(v.vendedorId);
      return [v.numero, Datas.curta(v.dia) + '/' + v.dia.slice(0, 4), v.hora, c ? c.nome : 'Consumidor final', u ? u.nome : '', v.itens.map(function (i) { return i.qtd + 'x ' + L.prod(i.produtoId).nome; }).join(' | '), Dinheiro.formatar(v.descontoCentavos || 0), Dinheiro.formatar(v.totalCentavos), v.pagamentos.map(function (p) { return L.FORMAS[p.forma].nome; }).join(' + ')];
    }));
    L.baixar('vendas-' + L.hoje + '.csv', Csv.gerar(linhas));
  });
})(L);
