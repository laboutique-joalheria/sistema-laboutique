/* CLIENTES: busca que perdoa erro + ficha única com tudo do cliente:
   compras, pedidos, receita óptica, medidas de joia e parcelas. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic, R$ = L.R$;
  var filtro = 'todos', consulta = '';
  var PASSO = 80, limite = PASSO;

  var CAMPOS = [{ chave: 'nome', peso: 3 }, { chave: 'telefone', telefone: true }, { chave: 'email', peso: 1 }, { chave: function (c) { return (c.tags || []).join(' '); }, peso: 1 }];

  var FILTROS = [
    ['todos', 'Todos', function () { return true; }],
    ['joia', 'Joalheria', function (c) { return c.interesses.indexOf('joia') >= 0; }],
    ['otica', 'Ótica', function (c) { return c.interesses.indexOf('otica') >= 0; }],
    ['niver', 'Aniversário em 30 dias', function (c) { return c.nascimento && Datas.diasAteAniversario(c.nascimento, L.hoje) <= 30; }],
    ['aberto', 'Com parcela aberta', function (c) { return L.emAberto(c.id) > 0; }],
    ['vip', 'VIP', function (c) { return (c.tags || []).indexOf('VIP') >= 0; }],
    // Só aparece com cadastros importados que pedem conferência.
    ['revisar', 'Revisar', function (c) { return (c.tags || []).indexOf('Revisar') >= 0; }, true]
  ];

  function filtrar() {
    var f = FILTROS.find(function (x) { return x[0] === filtro; })[2];
    var base = L.D.clientes.filter(f);
    // Quem comprou por último primeiro; empate (ninguém comprou ainda) em ordem alfabética.
    if (!consulta.trim()) return base.slice().sort(function (a, b) { var ua = L.stats(a.id).ultima || '', ub = L.stats(b.id).ultima || ''; return ua !== ub ? (ub < ua ? -1 : 1) : a.nome.localeCompare(b.nome, 'pt-BR'); });
    return Busca.buscar(base, consulta, CAMPOS, base.length || 1); // a paginação corta, a busca não
  }

  function tagsCliente(c) {
    return (c.interesses || []).map(L.pilulaSegmento).join('') + (c.tags || []).filter(function (t) { return t === 'VIP' || t === 'Revisar'; }).map(function (t) { return t === 'VIP' ? L.pilula('vip', 'VIP') : L.pilula('atencao', 'Revisar'); }).join('');
  }

  function linhas() {
    var todos = filtrar(), lista = todos.slice(0, limite);
    if (!lista.length) {
      var q = consulta.trim();
      return '<div class="sem-resultado">' + ic('busca', 'lg') + '<h3>' + (q ? 'Não achamos “' + esc(q) + '”' : 'Ninguém neste filtro') + '</h3>' +
        '<p>' + (q ? 'Confira a grafia ou busque pelo telefone.' : 'Troque o filtro para ver mais clientes.') + '</p>' +
        (q ? '<button class="btn ouro" data-novo-cliente="' + esc(q) + '">' + ic('usuario-mais') + 'Cadastrar “' + esc(q) + '”</button>' : '<button class="btn" data-filtro="todos">Ver todos</button>') + '</div>';
    }
    return '<ul class="lista">' + lista.map(function (c) {
      var s = L.stats(c.id);
      return '<li><button class="lista-linha" data-cliente="' + c.id + '">' + L.avatar(c) +
        '<span style="min-width:0"><strong>' + esc(c.nome) + '</strong><small class="num">' + esc(c.telefone || c.cidade || 'sem telefone') + '</small></span>' +
        '<span class="tags some-medio">' + tagsCliente(c) + '</span>' +
        '<span class="direita"><strong class="num">' + (s.n ? R$(s.total) : '—') + '</strong><small>' + (s.ultima ? 'comprou ' + Datas.relativo(s.ultima, L.hoje) : 'sem compras ainda') + '</small></span>' +
        ic('dir') + '</button></li>';
    }).join('') + '</ul>' +
      (todos.length > lista.length ? '<div class="mostrar-mais"><span class="muted">Mostrando ' + lista.length + ' de ' + todos.length + '</span><button class="btn" data-mais-clientes>' + ic('baixo') + 'Mostrar mais ' + Math.min(PASSO, todos.length - lista.length) + '</button></div>' : '');
  }

  L.telas.clientes = {
    titulo: 'Clientes',
    html: function () {
      var chips = FILTROS.map(function (f) {
        var n = L.D.clientes.filter(f[2]).length;
        if (f[3] && !n) return '';
        return '<button class="chip" data-filtro="' + f[0] + '" aria-pressed="' + (filtro === f[0]) + '">' + esc(f[1]) + ' <span class="cont">' + n + '</span></button>';
      }).join('');
      return '<div class="cabeca"><div><h1>Clientes</h1><p>Busque por nome, telefone ou e-mail. A ficha mostra compras, pedidos, receita e medidas.</p></div>' +
        '<div class="cabeca-acoes"><button class="btn" data-novo-cliente="">' + ic('usuario-mais') + 'Novo cliente</button></div></div>' +
        '<div class="barra-ferramentas"><label class="busca-campo"><span class="sr">Buscar cliente</span>' + ic('busca') +
        '<input class="entrada" id="busca-clientes" type="search" placeholder="Nome, telefone ou e-mail" value="' + esc(consulta) + '" autocomplete="off"></label>' +
        '<div class="chips" role="group" aria-label="Filtros">' + chips + '</div></div>' +
        '<section class="painel" id="lista-clientes" aria-live="polite">' + linhas() + '</section>';
    },
    depois: function (v) {
      var campo = L.$('#busca-clientes', v);
      campo.addEventListener('input', function () { consulta = campo.value; limite = PASSO; L.$('#lista-clientes').innerHTML = linhas(); });
      if (L.E.param && L.cli(L.E.param)) L.abrirCliente(L.E.param, { semRota: true });
    }
  };

  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-filtro]');
    if (f && L.E.rota === 'clientes') { filtro = f.dataset.filtro; limite = PASSO; L.atualizar(); return; }
    if (e.target.closest('[data-mais-clientes]')) { limite += PASSO; Som.tocar('seta'); L.$('#lista-clientes').innerHTML = linhas(); return; }
    var c = e.target.closest('[data-cliente]');
    if (c) { L.abrirCliente(c.dataset.cliente); return; }
    var n = e.target.closest('[data-novo-cliente]');
    if (n) L.novoCliente(n.dataset.novoCliente, function (novo) { consulta = ''; if (L.E.rota === 'clientes') L.atualizar(); L.abrirCliente(novo.id); });
  });

  L.filtrarClientes = function (f) { filtro = f; consulta = ''; limite = PASSO; L.ir('clientes', null, { forcarAnimacao: true }); };

  /* ------------------------------ ficha ------------------------------ */
  function historico(c) {
    var D = L.D, ev = [];
    D.vendas.forEach(function (v) {
      if (v.clienteId !== c.id) return;
      ev.push({ dia: v.dia, cor: 'var(--ouro)', titulo: 'Compra ' + v.numero + ' · ' + R$(v.totalCentavos), texto: v.itens.map(function (i) { return (i.qtd > 1 ? i.qtd + '× ' : '') + (L.prod(i.produtoId) || {}).nome; }).join(', ') });
    });
    D.pedidos.forEach(function (p) {
      if (p.clienteId !== c.id) return;
      ev.push({ dia: p.criado, cor: p.tipo === 'otica' ? 'var(--safira)' : 'var(--ametista)', titulo: 'Pedido ' + p.numero + ' · ' + Pedidos.nomeEtapa(p.tipo, p.etapa), texto: p.descricao });
    });
    D.orcamentos.forEach(function (q) {
      if (q.clienteId !== c.id) return;
      ev.push({ dia: q.criado, cor: 'var(--muted)', titulo: 'Orçamento ' + q.numero + (q.status === 'convertido' ? ' · virou venda' : ''), texto: q.itens.map(function (i) { return (L.prod(i.produtoId) || {}).nome; }).join(', ') });
    });
    if (c.receita) ev.push({ dia: c.receita.data, cor: 'var(--safira)', titulo: 'Receita óptica · ' + c.receita.tipo, texto: c.receita.profissional });
    if (c.desde) ev.push({ dia: c.desde, cor: 'var(--esmeralda)', titulo: 'Primeiro cadastro', texto: 'Cliente da loja' });
    ev.sort(function (a, b) { return a.dia < b.dia ? 1 : -1; });
    if (!ev.length) return '<p class="muted">' + (c.codigoAntigo ? 'Cliente trazido do sistema antigo (código ' + esc(c.codigoAntigo) + '). As próximas compras, pedidos e receitas aparecem aqui.' : 'Sem histórico ainda.') + '</p>';
    return '<ol class="historico">' + ev.map(function (e) {
      return '<li style="--cor:' + e.cor + '"><strong>' + esc(e.titulo) + '</strong><small>' + esc(Datas.curta(e.dia)) + ' · ' + esc(Datas.relativo(e.dia, L.hoje)) + '</small><small>' + esc(e.texto) + '</small></li>';
    }).join('') + '</ol>';
  }

  L.tabelaReceita = function (r) {
    var cols = [['esf', 'ESF'], ['cil', 'CIL'], ['eixo', 'EIXO'], ['add', 'ADIÇÃO'], ['dnp', 'DNP'], ['alt', 'ALT']];
    return '<div class="tabela-wrap"><table class="receita"><thead><tr><th></th>' + cols.map(function (c) { return '<th scope="col">' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      ['OD', 'OE'].map(function (olho) {
        return '<tr><th scope="row" title="' + (olho === 'OD' ? 'Olho direito' : 'Olho esquerdo') + '">' + olho + '</th>' + cols.map(function (c) { var v = r[olho][c[0]]; return '<td>' + esc(v ? (c[0] === 'eixo' ? v + '°' : v) : '—') + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  };

  function receita(c) {
    if (!c.receita) return '<p class="muted">Sem receita cadastrada.</p>';
    var r = c.receita, d = Datas.diferencaDias(L.hoje, r.validade);
    var sit = d < 0 ? L.pilula('atrasado', 'Vencida ' + Datas.relativo(r.validade, L.hoje)) : d <= 30 ? L.pilula('atencao', 'Vence ' + Datas.relativo(r.validade, L.hoje)) : L.pilula('ok', 'Válida até ' + Datas.curta(r.validade));
    return '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + L.pilula('otica', r.tipo) + sit + '</div>' + L.tabelaReceita(r) +
      '<p class="muted" style="font-size:var(--fs-sm)">Emitida em ' + esc(Datas.curta(r.data)) + ' · ' + esc(r.profissional) + '. Medidas em dioptrias; DNP e altura em mm.</p>';
  }

  function joia(c) {
    if (!c.joia) return '<p class="muted">Sem medidas registradas.</p>';
    return '<dl class="atributos"><dt>Aro</dt><dd class="num">' + esc(c.joia.aro) + '</dd><dt>Metal preferido</dt><dd>' + esc(c.joia.metal) + '</dd>' + (c.joia.datas ? '<dt>Data especial</dt><dd>' + esc(c.joia.datas) + '</dd>' : '') + '</dl>';
  }

  function dados(c) {
    var nasc = c.nascimento ? Datas.curta(c.nascimento) + ' · ' + (Number(L.hoje.slice(0, 4)) - Number(c.nascimento.slice(0, 4)) - (L.hoje.slice(5) < c.nascimento.slice(5) ? 1 : 0)) + ' anos' : '—';
    var tel = c.telefone || (c.telefoneOriginal ? c.telefoneOriginal + ' (incompleto)' : '—');
    var desde = c.desde ? Datas.curta(c.desde) + '/' + c.desde.slice(0, 4) : c.codigoAntigo ? 'Sistema antigo · código ' + c.codigoAntigo : '—';
    return '<dl class="atributos"><dt>WhatsApp</dt><dd class="num">' + esc(tel) + '</dd><dt>E-mail</dt><dd>' + esc(c.email || '—') + '</dd><dt>Nascimento</dt><dd>' + esc(nasc) + '</dd>' +
      (c.documento ? '<dt>' + (c.documento.tipo === 'cnpj' ? 'CNPJ' : 'CPF') + '</dt><dd class="num">' + esc(documentoTexto(c.documento)) + '</dd>' : '') +
      (c.endereco || c.cidade ? '<dt>Endereço</dt><dd>' + esc([c.endereco, c.cidade].filter(Boolean).join(' · ')) + '</dd>' : '') +
      '<dt>Cliente desde</dt><dd>' + esc(desde) + '</dd></dl>' +
      (c.notas ? '<div class="secao"><h3>Observações</h3><p>' + esc(c.notas) + '</p></div>' : '') + L.secaoImportacao(c.importacao);
  }
  /* CPF aparece mascarado na tela (LGPD: só o necessário para conferir); CNPJ é público. */
  function documentoTexto(d) {
    var t = d.tipo === 'cpf' ? '***.' + d.digitos.slice(3, 6) + '.' + d.digitos.slice(6, 9) + '-**'
      : d.tipo === 'cnpj' ? d.digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : d.digitos;
    return t + (d.valido ? '' : ' (dígito não confere)');
  }

  L.abrirCliente = function (id, opcoes) {
    var c = L.cli(id); if (!c) return;
    opcoes = opcoes || {};
    var s = L.stats(id), aberto = L.emAberto(id);
    var abas = [['hist', 'Histórico'], ['receita', 'Receita'], ['joia', 'Joias'], ['dados', 'Dados']];
    var topo = L.avatar(c) + '<div style="min-width:0"><h2>' + esc(c.nome) + '</h2><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' + tagsCliente(c) + (c.tags || []).filter(function (t) { return t !== 'VIP' && t !== 'Revisar'; }).map(function (t) { return L.pilula('info', t); }).join('') + '</div></div>';
    var niver = c.nascimento ? Datas.diasAteAniversario(c.nascimento, L.hoje) : 99;
    var corpo =
      (niver <= 7 ? '<p class="pilula hoje" style="justify-self:start">' + ic('presente') + (niver === 0 ? 'Faz aniversário hoje' : 'Aniversário ' + Datas.relativo(Datas.somarDias(L.hoje, niver), L.hoje)) + '</p>' : '') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        (L.podeVender() ? '<button class="btn ouro" data-vender-para="' + c.id + '">' + ic('vendas') + 'Vender para ' + esc(L.primeiroNome(c.nome)) + '</button>' : '') +
        (c.telefone ? L.linkWa('Olá, ' + L.primeiroNome(c.nome) + '! Aqui é da ' + L.D.loja.nome + '.', 'WhatsApp', '', c) : '') +
        '<button class="btn" data-agendar-para="' + c.id + '">' + ic('agenda') + 'Agendar</button></div>' +
      '<div class="ficha-numeros"><div><strong>' + (s.n ? R$(s.total) : '—') + '</strong><small>em compras</small></div><div><strong>' + s.n + '</strong><small>' + (s.n === 1 ? 'compra' : 'compras') + '</small></div><div><strong style="color:' + (aberto ? 'var(--citrino-texto)' : 'inherit') + '">' + R$(aberto) + '</strong><small>em aberto</small></div></div>' +
      '<div class="abas" role="tablist">' + abas.map(function (a, i) { return '<button class="aba" role="tab" data-aba-ficha="' + a[0] + '" aria-selected="' + (i === 0) + '">' + a[1] + '</button>'; }).join('') + '</div>' +
      '<div id="ficha-conteudo">' + historico(c) + '</div>';
    var g = L.gaveta({ rotulo: 'Ficha de ' + c.nome, topo: '<div class="ficha-cab">' + topo + '</div>', corpo: corpo, aoFechar: function () { if (!opcoes.semRota && L.E.rota === 'clientes' && L.E.param) { try { history.replaceState(null, '', '#clientes'); } catch (e) {} L.E.param = null; } } });
    if (!opcoes.semRota && L.E.rota === 'clientes') { try { history.replaceState(null, '', '#clientes.' + id); } catch (e) {} L.E.param = id; }
    g.addEventListener('click', function (e) {
      var a = e.target.closest('[data-aba-ficha]');
      if (!a) return;
      L.$$('[data-aba-ficha]', g).forEach(function (b) { b.setAttribute('aria-selected', String(b === a)); });
      var alvo = a.dataset.abaFicha;
      L.$('#ficha-conteudo', g).innerHTML = alvo === 'hist' ? historico(c) : alvo === 'receita' ? receita(c) : alvo === 'joia' ? joia(c) : dados(c);
      Som.tocar('clique');
    });
  };

  document.addEventListener('click', function (e) {
    var v = e.target.closest('[data-vender-para]');
    if (v) { L.fecharTudo(); L.abrirVenda({ clienteId: v.dataset.venderPara }); return; }
    var a = e.target.closest('[data-agendar-para]');
    if (a) { L.fecharTudo(); L.novoCompromisso({ clienteId: a.dataset.agendarPara }); }
  });

  /* ------------------------------ cadastro rápido ------------------------------ */
  /* Só o essencial para não travar o atendimento: nome e WhatsApp. O resto completa depois. */
  L.novoCliente = function (nomeInicial, aoSalvar) {
    var soDigitos = /^[\d\s()+-]+$/.test(nomeInicial || '');
    var corpo = '<form id="form-cliente" class="grade-form" novalidate>' +
      '<label class="campo inteiro"><span>Nome completo *</span><input class="entrada" id="nc-nome" required autocomplete="off" value="' + esc(soDigitos ? '' : nomeInicial || '') + '"></label>' +
      '<label class="campo"><span>WhatsApp *</span><input class="entrada num" id="nc-tel" inputmode="tel" required placeholder="(55) 9 0000-0000" value="' + esc(soDigitos ? nomeInicial : '') + '"></label>' +
      '<label class="campo"><span>Nascimento</span><input class="entrada" id="nc-nasc" type="date"></label>' +
      '<fieldset class="campo inteiro" style="border:0;padding:0;margin:0"><legend style="font-size:var(--fs-sm);font-weight:650;color:var(--fg-2);margin-bottom:6px">Interesse</legend><div class="chips"><button type="button" class="chip" data-int="joia" aria-pressed="false">Joalheria</button><button type="button" class="chip" data-int="otica" aria-pressed="false">Ótica</button></div></fieldset>' +
      '<label class="campo inteiro"><span>Observações</span><textarea class="entrada" id="nc-notas" rows="3" placeholder="Preferências, medidas, quem indicou…"></textarea></label>' +
      '<p class="muted inteiro" id="nc-erro" role="alert"></p></form>';
    var g = L.gaveta({ rotulo: 'Novo cliente', topo: '<div><p class="rotulo">Cadastro rápido</p><h2>Novo cliente</h2></div>', corpo: corpo,
      pe: '<button class="btn" data-fechar-gaveta>Cancelar</button><button class="btn ouro" form="form-cliente" type="submit">' + ic('check') + 'Cadastrar cliente</button>' });
    g.querySelector('[data-fechar-gaveta]').addEventListener('click', function () { L.fecharCamada(); });
    g.addEventListener('click', function (e) { var ch = e.target.closest('[data-int]'); if (ch) { ch.setAttribute('aria-pressed', String(ch.getAttribute('aria-pressed') !== 'true')); Som.tocar('alternar'); } });
    L.$('#form-cliente', g).addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = L.$('#nc-nome', g).value.trim(), tel = L.$('#nc-tel', g).value.trim();
      var erro = !nome ? 'Informe o nome do cliente.' : tel.replace(/\D/g, '').length < 10 ? 'Informe o WhatsApp com DDD (10 ou 11 dígitos).' : '';
      var dup = !erro && L.D.clientes.find(function (c) { return c.telefone.replace(/\D/g, '') === tel.replace(/\D/g, ''); });
      if (dup) erro = 'Esse WhatsApp já é de ' + dup.nome + '. Abra a ficha existente para não duplicar.';
      if (erro) { L.$('#nc-erro', g).textContent = erro; L.$('#nc-erro', g).style.color = 'var(--rubi-texto)'; Som.tocar('erro'); return; }
      var d = tel.replace(/\D/g, '');
      var novo = {
        id: 'c' + Date.now().toString(36), nome: nome, telefone: '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4),
        nascimento: L.$('#nc-nasc', g).value || null, desde: L.hoje,
        interesses: L.$$('[data-int][aria-pressed="true"]', g).map(function (b) { return b.dataset.int; }), tags: [], notas: L.$('#nc-notas', g).value.trim()
      };
      L.D.clientes.push(novo); L.salvar();
      L.fecharCamada(null, true);
      Som.tocar('sucesso');
      L.toast('Cliente <strong>' + esc(novo.nome) + '</strong> cadastrado.');
      if (aoSalvar) aoSalvar(novo);
    });
  };
})(L);
