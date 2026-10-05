/* FINANCEIRO: separa o que é previsto, vencido e realizado. Baixa tem estorno explícito.
   "Recebido" aqui é controle interno: não substitui a conciliação com banco ou maquininha. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic, R$ = L.R$;
  var situacaoFiltro = 'abertos';

  function aba() { return ['pagar', 'caixa'].indexOf(L.E.param) >= 0 ? L.E.param : 'receber'; }

  function situacao(f) {
    if (f.status === 'pago') return L.pilula('ok', (f.tipo === 'receber' ? 'Recebido ' : 'Pago ') + Datas.curta(f.pagoEm), 'check');
    var d = Datas.diferencaDias(L.hoje, f.vencimento);
    if (d < 0) return L.pilula('atrasado', 'Vencido ' + Datas.relativo(f.vencimento, L.hoje));
    if (d === 0) return L.pilula('atencao', 'Vence hoje');
    if (d <= 7) return L.pilula('atencao', 'Vence ' + Datas.relativo(f.vencimento, L.hoje));
    return L.pilula('info', 'Previsto');
  }

  function tabela(tipo) {
    var fs = L.D.financeiro.filter(function (f) { return f.tipo === tipo && (situacaoFiltro === 'todos' || (situacaoFiltro === 'abertos' ? f.status === 'aberto' : f.status === 'pago')); })
      .sort(function (a, b) { return a.vencimento < b.vencimento ? -1 : 1; });
    var chips = [['abertos', 'Em aberto'], ['pagos', tipo === 'receber' ? 'Recebidos' : 'Pagos'], ['todos', 'Todos']].map(function (c) { return '<button class="chip" data-sit-fin="' + c[0] + '" aria-pressed="' + (situacaoFiltro === c[0]) + '">' + c[1] + '</button>'; }).join('');
    var linhas = fs.map(function (f) {
      var c = f.clienteId && L.cli(f.clienteId);
      var acao = f.status === 'aberto'
        ? '<button class="btn sm' + (Datas.diferencaDias(L.hoje, f.vencimento) <= 0 ? ' ouro' : '') + '" data-baixar="' + f.id + '">' + (tipo === 'receber' ? 'Receber' : 'Pagar') + '</button>'
        : '<button class="btn sm fantasma" data-estornar="' + f.id + '">Estornar</button>';
      return '<tr id="fin-' + f.id + '" class="' + (f.status === 'pago' ? 'feito' : '') + '"><td class="num" style="white-space:nowrap">' + Datas.curta(f.vencimento) + '</td><td><strong>' + esc(f.descricao) + '</strong>' + (c ? '<small>' + esc(c.nome) + '</small>' : '') + '</td><td>' + situacao(f) + '</td><td class="valor"><strong>' + R$(f.valorCentavos) + '</strong></td><td style="text-align:right">' + acao + '</td></tr>';
    }).join('');
    return '<div class="chips" style="margin-bottom:12px">' + chips + '</div><section class="painel"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Vencimento</th><th>Descrição</th><th>Situação</th><th class="valor">Valor</th><th></th></tr></thead><tbody>' +
      (linhas || '<tr><td colspan="5"><div class="vazio"><p>Nada por aqui.</p></div></td></tr>') + '</tbody></table></div></section>';
  }

  function caixa() {
    var D = L.D, vendas = D.vendas.filter(function (v) { return v.dia === L.hoje; });
    var porForma = { pix: 0, credito: 0, debito: 0, dinheiro: 0, crediario: 0 };
    vendas.forEach(function (v) { v.pagamentos.forEach(function (p) { porForma[p.forma] += p.valor; }); });
    var recebidosHoje = D.financeiro.filter(function (f) { return f.tipo === 'receber' && f.status === 'pago' && f.pagoEm === L.hoje; });
    recebidosHoje.forEach(function (f) { porForma[f.forma] = (porForma[f.forma] || 0) + f.valorCentavos; });
    var mov = D.caixa.movimentos;
    var sangria = mov.filter(function (m) { return m.tipo === 'sangria'; }).reduce(function (s, m) { return s + m.valor; }, 0);
    var suprimento = mov.filter(function (m) { return m.tipo === 'suprimento'; }).reduce(function (s, m) { return s + m.valor; }, 0);
    var esperado = D.caixa.fundo + porForma.dinheiro + suprimento - sangria;
    var cards = Object.keys(L.FORMAS).map(function (k) { return '<div class="caixa-forma"><span class="rotulo">' + ic(L.FORMAS[k].icone, 'sm') + ' ' + L.FORMAS[k].nome + '</span><strong>' + R$(porForma[k] || 0) + '</strong></div>'; }).join('');
    var linhas = [['Fundo de troco (abertura)', D.caixa.fundo, ''], ['Vendas e recebimentos em dinheiro', porForma.dinheiro, '+'], ['Suprimentos', suprimento, '+'], ['Sangrias', sangria, '−']].map(function (l) { return '<tr><td>' + l[0] + '</td><td class="valor">' + (l[2] ? l[2] + ' ' : '') + R$(l[1]) + '</td></tr>'; }).join('');
    return '<section class="painel" style="margin-bottom:16px"><div class="painel-topo"><h2>Entradas de hoje por forma</h2><span class="muted">' + vendas.length + ' vendas · ' + recebidosHoje.length + ' parcelas recebidas</span></div><div class="caixa-formas">' + cards + '</div></section>' +
      '<section class="painel"><div class="painel-topo"><h2>Dinheiro na gaveta</h2>' + (D.caixa.fechado ? L.pilula('ok', 'Caixa fechado às ' + D.caixa.fechado.hora, 'check') : L.pilula('info', 'Caixa aberto')) + '</div>' +
      '<div class="tabela-wrap"><table class="tabela"><tbody>' + linhas + '<tr><td><strong>Esperado na gaveta</strong></td><td class="valor"><strong style="font-size:var(--fs-xl)">' + R$(esperado) + '</strong></td></tr>' +
      (D.caixa.fechado ? '<tr><td>Contado no fechamento</td><td class="valor">' + R$(D.caixa.fechado.contado) + ' · ' + diferenca(D.caixa.fechado.contado - D.caixa.fechado.esperado) + '</td></tr>' : '') + '</tbody></table></div>' +
      (D.caixa.fechado ? '' : '<div class="painel-corpo" style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line)"><button class="btn" data-mov-caixa="sangria">' + ic('menos') + 'Sangria</button><button class="btn" data-mov-caixa="suprimento">' + ic('mais') + 'Suprimento</button><button class="btn ouro" data-fechar-caixa="' + esperado + '" style="margin-left:auto">' + ic('check') + 'Fechar caixa</button></div>') + '</section>';
  }
  function diferenca(d) { return d === 0 ? '<span style="color:var(--esmeralda-texto);font-weight:800">confere</span>' : d > 0 ? '<span style="color:var(--citrino-texto);font-weight:800">sobra ' + R$(d) + '</span>' : '<span style="color:var(--rubi-texto);font-weight:800">falta ' + R$(-d) + '</span>'; }

  L.telas.financeiro = {
    titulo: 'Financeiro',
    html: function () {
      var D = L.D, a = aba();
      var abertos = D.financeiro.filter(function (f) { return f.status === 'aberto'; });
      var soma = function (lista) { return lista.reduce(function (s, f) { return s + f.valorCentavos; }, 0); };
      var vencido = soma(abertos.filter(function (f) { return f.tipo === 'receber' && f.vencimento < L.hoje; }));
      var receber7 = soma(abertos.filter(function (f) { return f.tipo === 'receber' && f.vencimento >= L.hoje && f.vencimento <= Datas.somarDias(L.hoje, 7); }));
      var pagar7 = soma(abertos.filter(function (f) { return f.tipo === 'pagar' && f.vencimento <= Datas.somarDias(L.hoje, 7); }));
      var mes = L.hoje.slice(0, 7);
      var recebidoMes = soma(D.financeiro.filter(function (f) { return f.tipo === 'receber' && f.status === 'pago' && f.pagoEm && f.pagoEm.slice(0, 7) === mes; })) + D.vendas.filter(function (v) { return v.dia.slice(0, 7) === mes; }).reduce(function (s, v) { return s + v.pagamentos.filter(function (p) { return p.forma !== 'crediario'; }).reduce(function (x, p) { return x + p.valor; }, 0); }, 0);
      var tab = function (id, nome, n) { return '<button class="aba" role="tab" data-aba-fin="' + id + '" aria-selected="' + (a === id) + '">' + nome + (n != null ? '<span class="cont">' + n + '</span>' : '') + '</button>'; };
      return '<div class="cabeca"><div><h1>Financeiro</h1><p>O que entra, o que sai e o caixa de hoje. Previsto, vencido e realizado sempre separados.</p></div></div>' +
        '<div class="kpis">' +
          '<button class="kpi" data-aba-fin="receber" data-inclinar><span class="rotulo">' + ic('alerta') + 'Vencido a receber</span><span class="valor" style="color:' + (vencido ? 'var(--rubi-texto)' : 'inherit') + '">' + R$(vencido) + '</span><span class="nota">cobrar com cuidado</span></button>' +
          '<button class="kpi safira" data-aba-fin="receber" data-inclinar><span class="rotulo">' + ic('moeda') + 'Entra em 7 dias</span><span class="valor" data-contar="' + receber7 + '" data-formato="moeda">' + R$(receber7) + '</span><span class="nota">parcelas e saldos</span></button>' +
          '<button class="kpi ametista" data-aba-fin="pagar" data-inclinar><span class="rotulo">' + ic('financeiro') + 'Sai em 7 dias</span><span class="valor" data-contar="' + pagar7 + '" data-formato="moeda">' + R$(pagar7) + '</span><span class="nota">fornecedores e contas</span></button>' +
          '<button class="kpi verde" data-aba-fin="caixa" data-inclinar><span class="rotulo">' + ic('check') + 'Realizado no mês</span><span class="valor" data-contar="' + recebidoMes + '" data-formato="moeda">' + R$(recebidoMes) + '</span><span class="nota">vendas à vista e parcelas recebidas</span></button>' +
        '</div>' +
        '<div class="abas" role="tablist" style="margin-bottom:16px;max-width:max-content">' + tab('receber', 'A receber', abertos.filter(function (f) { return f.tipo === 'receber'; }).length) + tab('pagar', 'A pagar', abertos.filter(function (f) { return f.tipo === 'pagar'; }).length) + tab('caixa', 'Caixa de hoje') + '</div>' +
        '<div id="fin-conteudo">' + (a === 'caixa' ? caixa() : tabela(a)) + '</div>';
    }
  };

  function baixar(id) {
    var tr = L.$('#fin-' + id);
    var acoes = tr.lastElementChild;
    acoes.innerHTML = '<div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><select class="entrada" id="forma-' + id + '" style="min-height:36px;width:auto" aria-label="Forma">' + ['pix', 'dinheiro', 'debito', 'credito'].map(function (k) { return '<option value="' + k + '">' + L.FORMAS[k].nome + '</option>'; }).join('') + '</select><button class="btn sm ouro" data-confirmar-baixa="' + id + '">Confirmar</button><button class="btn sm fantasma" data-cancelar-baixa>Cancelar</button></div>';
    L.$('#forma-' + id).focus();
  }

  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-aba-fin]'))) { L.ir('financeiro', t.dataset.abaFin === 'receber' ? null : t.dataset.abaFin, { som: false }); Som.tocar('clique'); return; }
    if ((t = e.target.closest('[data-sit-fin]'))) { situacaoFiltro = t.dataset.sitFin; L.atualizar(); return; }
    if ((t = e.target.closest('[data-baixar]'))) { baixar(t.dataset.baixar); Som.tocar('clique'); return; }
    if (e.target.closest('[data-cancelar-baixa]')) { L.atualizar(); return; }
    if ((t = e.target.closest('[data-confirmar-baixa]'))) {
      var f = L.D.financeiro.find(function (x) { return x.id === t.dataset.confirmarBaixa; });
      f.forma = L.$('#forma-' + f.id).value; f.status = 'pago'; f.pagoEm = L.hoje;
      L.salvar(); L.atualizar(); Som.tocar('sucesso');
      var c = f.clienteId && L.cli(f.clienteId);
      L.toast((f.tipo === 'receber' ? 'Recebido ' : 'Pago ') + R$(f.valorCentavos) + (c ? ' de ' + esc(L.primeiroNome(c.nome)) : '') + ' (' + L.FORMAS[f.forma].nome + ').', { acao: { texto: 'Desfazer', fn: function () { estornar(f.id, true); } } });
      return;
    }
    if ((t = e.target.closest('[data-estornar]'))) {
      var id = t.dataset.estornar;
      L.confirmar({ titulo: 'Estornar esta baixa?', texto: 'O lançamento volta a ficar em aberto. Se o dinheiro já saiu ou entrou no banco, a devolução lá é feita à parte.', ok: 'Estornar', perigo: true })
        .then(function (sim) { if (sim) estornar(id); });
      return;
    }
    if ((t = e.target.closest('[data-mov-caixa]'))) { movimento(t.dataset.movCaixa); return; }
    if ((t = e.target.closest('[data-fechar-caixa]'))) { fecharCaixa(Number(t.dataset.fecharCaixa)); }
  });

  function estornar(id, rapido) {
    var f = L.D.financeiro.find(function (x) { return x.id === id; });
    f.status = 'aberto'; delete f.pagoEm; delete f.forma;
    L.salvar(); if (L.E.rota === 'financeiro') L.atualizar();
    Som.tocar('remover');
    L.toast(rapido ? 'Baixa desfeita.' : 'Baixa estornada. O lançamento voltou para em aberto.', { icone: 'restaurar' });
  }

  function movimento(tipo) {
    var m = L.modal({ titulo: tipo === 'sangria' ? 'Sangria (retirar dinheiro)' : 'Suprimento (colocar dinheiro)',
      corpo: '<label class="campo"><span>Valor</span><input class="entrada num" id="mov-valor" inputmode="decimal" placeholder="0,00" autofocus></label><label class="campo"><span>Motivo</span><input class="entrada" id="mov-motivo" placeholder="' + (tipo === 'sangria' ? 'Depósito no banco' : 'Troco extra') + '"></label><p id="mov-erro" role="alert" style="color:var(--rubi-texto)"></p>',
      pe: '<button class="btn ouro" id="mov-ok">Registrar</button>' });
    L.$('#mov-ok', m).addEventListener('click', function () {
      var v = Dinheiro.lerReais(L.$('#mov-valor', m).value);
      if (!(v > 0)) { L.$('#mov-erro', m).textContent = 'Informe um valor, por exemplo 150,00.'; Som.tocar('erro'); return; }
      L.D.caixa.movimentos.push({ tipo: tipo, valor: v, motivo: L.$('#mov-motivo', m).value, hora: L.horaAgora() });
      L.salvar(); m.fechar(); L.atualizar(); Som.tocar('adicionar');
      L.toast((tipo === 'sangria' ? 'Sangria' : 'Suprimento') + ' de ' + R$(v) + ' registrada.');
    });
  }

  function fecharCaixa(esperado) {
    var m = L.modal({ titulo: 'Fechar caixa',
      corpo: '<p>Conte o dinheiro da gaveta e informe o valor. O sistema mostra se sobrou ou faltou.</p><label class="campo"><span>Valor contado</span><input class="entrada num" id="cx-contado" inputmode="decimal" placeholder="0,00" autofocus></label><p id="cx-dif" class="status-pagamento falta">Esperado: <strong class="num">' + R$(esperado) + '</strong></p>',
      pe: '<button class="btn ouro" id="cx-ok">Fechar caixa</button>' });
    var campo = L.$('#cx-contado', m), dif = L.$('#cx-dif', m);
    campo.addEventListener('input', function () {
      var v = Dinheiro.lerReais(campo.value);
      if (v == null) { dif.className = 'status-pagamento falta'; dif.innerHTML = 'Esperado: <strong class="num">' + R$(esperado) + '</strong>'; return; }
      var d = v - esperado;
      dif.className = 'status-pagamento ' + (d === 0 ? 'ok' : d > 0 ? 'falta' : 'erro');
      dif.innerHTML = d === 0 ? L.ic('check') + 'Confere com o esperado' : (d > 0 ? 'Sobra de ' : 'Falta de ') + '<strong class="num">' + R$(Math.abs(d)) + '</strong>';
    });
    L.$('#cx-ok', m).addEventListener('click', function () {
      var v = Dinheiro.lerReais(campo.value);
      if (v == null) { Som.tocar('erro'); campo.focus(); return; }
      L.D.caixa.fechado = { contado: v, esperado: esperado, hora: L.horaAgora() };
      L.salvar(); m.fechar(); L.atualizar(); Som.tocar('sucesso');
      L.toast('Caixa fechado.');
    });
  }
})(L);
