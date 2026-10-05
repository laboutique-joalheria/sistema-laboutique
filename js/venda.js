/* VENDA GUIADA: cliente → itens → pagamento, com o total sempre à vista.
   Ao concluir, uma única ação baixa o estoque, abre o pedido de óculos ou o serviço de joia
   e lança as parcelas do crediário. No sistema antigo eram telas separadas e redigitação. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic, R$ = L.R$;
  var root = window;
  var V = null, folha = null, camada = null;

  var CATEGORIAS = [
    ['tudo', 'Tudo', function () { return true; }],
    ['joia', 'Joias', function (p) { return p.segmento === 'joia'; }],
    ['armacao', 'Óculos e armações', function (p) { return p.segmento === 'otica' && !p.laboratorio && p.categoria !== 'Lentes de contato' && p.categoria !== 'Acessórios'; }],
    ['lente', 'Lentes', function (p) { return p.laboratorio || p.categoria === 'Lentes de contato' || p.categoria === 'Acessórios'; }],
    ['servico', 'Serviços', function (p) { return p.segmento === 'servico'; }]
  ];
  var CAMPOS_PROD = [{ chave: 'nome', peso: 3 }, { chave: 'sku', peso: 2 }, { chave: 'categoria', peso: 1 }, { chave: function (p) { return Object.values(p.atributos || {}).join(' '); }, peso: 0.6 }];
  var CAMPOS_CLI = [{ chave: 'nome', peso: 3 }, { chave: 'telefone', telefone: true }, { chave: 'email' }];

  function conta() {
    var c = Venda.calcular(V.itens, V.desconto.valor > 0 ? V.desconto : null);
    c.pag = Venda.conferirPagamentos(c.total, V.pagamentos);
    var limite = L.E.usuario.perfil === 'dono' ? 100 : 10;
    c.descontoAlto = c.subtotal > 0 && c.desconto / c.subtotal * 100 > limite + 0.001;
    c.limite = limite;
    return c;
  }

  L.abrirVenda = function (opcoes) {
    if (!L.podeVender()) { L.toast('Seu perfil não registra vendas.', { icone: 'alerta' }); return; }
    if (folha) return;
    opcoes = opcoes || {};
    V = { passo: 1, clienteId: null, final: false, itens: [], desconto: { tipo: 'valor', valor: 0 }, pagamentos: [], orcamentoId: null, categoria: 'tudo', buscaCli: '', buscaProd: '', concluida: null, modo: opcoes.modo || 'venda' };
    if (opcoes.orcamentoId) {
      var q = L.D.orcamentos.find(function (x) { return x.id === opcoes.orcamentoId; });
      V.orcamentoId = q.id; V.clienteId = q.clienteId;
      V.itens = q.itens.map(function (i) { return { produtoId: i.produtoId, qtd: i.qtd, precoCentavos: i.precoCentavos }; });
      V.desconto = { tipo: 'valor', valor: q.descontoCentavos || 0 };
      V.passo = 3;
    } else if (opcoes.clienteId) { V.clienteId = opcoes.clienteId; V.passo = 2; }
    // Peça sem preço pergunta o valor numa janela, então só entra depois que a venda abre.
    var pendente = null;
    if (opcoes.produtoId) { if (L.precoDe(L.prod(opcoes.produtoId))) adicionar(opcoes.produtoId, true); else pendente = opcoes.produtoId; }

    folha = document.createElement('div');
    folha.className = 'folha';
    folha.setAttribute('role', 'dialog'); folha.setAttribute('aria-modal', 'true'); folha.setAttribute('aria-labelledby', 'folha-titulo');
    folha.innerHTML = '<header class="folha-topo"><h2 id="folha-titulo"></h2><nav class="passos" id="passos" aria-label="Etapas da venda"></nav><button class="btn icone" id="folha-fechar" aria-label="Fechar venda">' + ic('fechar') + '</button></header>' +
      '<div class="folha-corpo"><section class="folha-etapa" id="etapa" aria-live="polite"></section><aside class="resumo" id="resumo" aria-label="Resumo da venda"></aside></div>';
    camada = L.abrirCamada(folha, { veu: false, antesDeFechar: pedirParaFechar, aoFechar: function () { folha = null; V = null; } });
    if (root.matchMedia('(max-width: 900px)').matches) L.$('#resumo', folha).classList.add('recolhido');
    L.$('#folha-fechar', folha).addEventListener('click', function () { L.fecharCamada(camada); });
    folha.addEventListener('click', aoClicar);
    folha.addEventListener('input', aoDigitar);
    folha.addEventListener('change', aoMudar);
    folha.addEventListener('keydown', aoTeclar);
    desenhar(true);
    Som.tocar('abrir');
    if (pendente) adicionar(pendente);
  };

  function pedirParaFechar() {
    if (!V || V.concluida || (!V.itens.length && !V.clienteId)) return true;
    L.confirmar({ titulo: 'Sair sem concluir?', texto: 'Os itens escolhidos serão descartados. Se quiser guardar, salve como orçamento.', ok: 'Descartar venda', cancelar: 'Continuar vendendo', perigo: true })
      .then(function (sim) { if (sim) L.fecharCamada(camada, true); });
    return false;
  }

  /* ------------------------------ desenho ------------------------------ */
  function desenhar(trocouEtapa) {
    if (!folha) return;
    L.$('#folha-titulo', folha).textContent = V.concluida ? 'Venda concluída' : V.orcamentoId ? 'Converter orçamento' : V.modo === 'orcamento' ? 'Novo orçamento' : 'Nova venda';
    passos();
    etapa(trocouEtapa);
    resumo();
  }

  function passos() {
    var nomes = ['Cliente', 'Itens', V.modo === 'orcamento' ? 'Revisão' : 'Pagamento'];
    L.$('#passos', folha).innerHTML = V.concluida ? '' : nomes.map(function (n, i) {
      var num = i + 1, estado = num === V.passo ? ' aria-current="step"' : '';
      var feito = num < V.passo ? ' feito' : '';
      return (i ? '<span class="passo-sep" aria-hidden="true"></span>' : '') + '<button class="passo' + feito + '" data-passo="' + num + '"' + estado + '><span class="n"><span>' + (feito ? '✓' : num) + '</span></span><span class="rotulo-passo">' + n + '</span></button>';
    }).join('');
  }

  function etapa(trocou) {
    var el = L.$('#etapa', folha);
    el.parentNode.classList.toggle('so-etapa', !!V.concluida);
    if (V.concluida) { el.innerHTML = telaSucesso(); posSucesso(el); return; }
    el.innerHTML = V.passo === 1 ? etapaCliente() : V.passo === 2 ? etapaItens() : etapaPagamento();
    L.$$('#etapa > *', folha).forEach(function (x, i) { x.style.setProperty('--i', i); });
    if (trocou) { el.classList.remove('trocou'); void el.offsetWidth; el.classList.add('trocou'); el.scrollTop = 0; }
    var foco = el.querySelector('[autofocus]');
    if (foco && trocou) setTimeout(function () { foco.focus({ preventScroll: true }); }, 40);
  }

  /* ---------- passo 1: cliente ---------- */
  function cartaoCliente(c) {
    var s = L.stats(c.id);
    return '<button class="cliente-op" data-escolher-cliente="' + c.id + '" aria-pressed="' + (V.clienteId === c.id) + '">' + L.avatar(c) + '<span style="min-width:0"><strong>' + esc(c.nome) + '</strong><small class="num">' + esc(c.telefone) + (s.ultima ? ' · ' + esc(Datas.relativo(s.ultima, L.hoje)) : '') + '</small></span></button>';
  }
  function resultadosClientes() {
    var q = V.buscaCli.trim();
    if (!q) {
      var hoje = L.D.agenda.filter(function (a) { return a.dia === L.hoje && a.clienteId; }).map(function (a) { return a.clienteId; });
      var recentes = L.D.clientes.slice().sort(function (a, b) { var ia = hoje.indexOf(a.id) >= 0, ib = hoje.indexOf(b.id) >= 0; if (ia !== ib) return ia ? -1 : 1; return (L.stats(b.id).ultima || '') < (L.stats(a.id).ultima || '') ? -1 : 1; }).slice(0, 8);
      return '<p class="rotulo" style="margin-top:20px">Na agenda de hoje e atendidos por último</p><div class="clientes-rapidos">' + recentes.map(cartaoCliente).join('') + '</div>';
    }
    var r = Busca.buscar(L.D.clientes, q, CAMPOS_CLI, 12);
    if (!r.length) return '<div class="sem-resultado">' + ic('usuario-mais', 'lg') + '<h3>Não achamos “' + esc(q) + '”</h3><button class="btn ouro" data-cadastrar-na-venda="' + esc(q) + '">Cadastrar e continuar</button></div>';
    return '<div class="clientes-rapidos">' + r.map(cartaoCliente).join('') + '</div>';
  }
  function etapaCliente() {
    return '<h3>Para quem é ' + (V.modo === 'orcamento' ? 'o orçamento' : 'a venda') + '?</h3>' +
      '<label class="busca-campo"><span class="sr">Buscar cliente</span>' + ic('busca') + '<input class="entrada" id="v-busca-cli" type="search" autofocus autocomplete="off" placeholder="Nome ou telefone do cliente" value="' + esc(V.buscaCli) + '"></label>' +
      '<div class="chips" style="margin-top:12px"><button class="chip" data-consumidor-final aria-pressed="' + V.final + '">' + ic('vendas', 'sm') + 'Consumidor final (sem cadastro)</button><button class="chip" data-cadastrar-na-venda="">' + ic('usuario-mais', 'sm') + 'Cadastrar cliente novo</button></div>' +
      '<div id="v-res-cli">' + resultadosClientes() + '</div>';
  }

  /* ---------- passo 2: itens ---------- */
  function dicaReceita() {
    var c = V.clienteId && L.cli(V.clienteId);
    if (!c || !c.receita) return '';
    var d = Datas.diferencaDias(L.hoje, c.receita.validade);
    if (d < 0) return '<p class="status-pagamento falta" style="margin:0 0 16px">' + ic('olho') + 'Receita de ' + esc(L.primeiroNome(c.nome)) + ' venceu ' + esc(Datas.relativo(c.receita.validade, L.hoje)) + '. Ofereça um novo exame antes das lentes.</p>';
    return '<p class="status-pagamento ok" style="margin:0 0 16px;justify-content:space-between;flex-wrap:wrap">' + '<span style="display:flex;gap:10px;align-items:center">' + ic('olho') + 'Receita ' + esc(c.receita.tipo.toLowerCase()) + ' válida até ' + esc(Datas.curta(c.receita.validade)) + '</span><button class="btn sm" data-categoria-venda="lente">Ver lentes' + ic('dir', 'sm') + '</button></p>';
  }
  function gradeProdutos() {
    var cat = CATEGORIAS.find(function (c) { return c[0] === V.categoria; })[2];
    var base = L.D.produtos.filter(cat);
    var lista = V.buscaProd.trim() ? Busca.buscar(base, V.buscaProd, CAMPOS_PROD, base.length || 1) : base;
    // Catálogo grande (importado): mostra os primeiros e diz quantos ficaram de fora.
    var corte = lista.length > 48 ? '<p class="muted" style="margin-top:12px">Mostrando 48 de ' + lista.length + '. ' + (V.buscaProd.trim() ? 'Refine a busca (ex.: código, metal ou modelo).' : 'Busque pelo nome ou pelo código para achar mais rápido.') + '</p>' : '';
    lista = corte ? lista.slice(0, 48) : lista;
    // A categoria escolhida nunca esconde o que existe em outra.
    if (!lista.length && V.buscaProd.trim() && V.categoria !== 'tudo') {
      var fora = Busca.buscar(L.D.produtos, V.buscaProd, CAMPOS_PROD, 48);
      if (fora.length) return '<p class="muted" style="margin-bottom:12px">Nada em “' + esc(CATEGORIAS.find(function (c) { return c[0] === V.categoria; })[1]) + '”. Achamos em outras categorias:</p>' + grade(fora);
    }
    if (!lista.length) return '<div class="sem-resultado">' + ic('busca', 'lg') + '<h3>Não achamos “' + esc(V.buscaProd) + '”</h3><p>Tente pelo código (SKU) ou por uma palavra só, como “aliança” ou “multifocal”.</p></div>';
    return grade(lista) + corte;
  }
  function grade(lista) {
    return '<div class="grade-produtos">' + lista.map(function (p) {
      var noCarrinho = V.itens.filter(function (i) { return i.produtoId === p.id; }).reduce(function (s, i) { return s + i.qtd; }, 0);
      var semEstoque = p.estoque != null && !p.encomenda && !p.laboratorio && p.estoque <= 0;
      return '<button class="produto" data-seg="' + p.segmento + '" data-add-produto="' + p.id + '"' + (semEstoque ? ' disabled aria-disabled="true"' : '') + ' data-inclinar>' +
        '<span class="arte">' + L.desenho(p.ilustracao) + '<span class="selo">' + (noCarrinho ? L.pilula('vip', noCarrinho + ' na venda', 'check') : '') + '</span></span>' +
        '<span style="display:grid;gap:2px"><h3>' + esc(p.nome) + '</h3><span class="sku mono">' + esc(p.sku) + '</span></span>' +
        '<span class="pe"><span class="preco' + (L.precoDe(p) ? '' : ' sem') + '">' + esc(L.precoTexto(p)) + '</span>' + L.pilulaEstoque(p) + '</span></button>';
    }).join('') + '</div>';
  }
  function etapaItens() {
    return '<h3>O que vai levar?</h3>' + dicaReceita() +
      '<div class="barra-ferramentas"><label class="busca-campo"><span class="sr">Buscar produto</span>' + ic('busca') + '<input class="entrada" id="v-busca-prod" type="search" autofocus autocomplete="off" placeholder="Nome, código ou característica (ex.: 18k, multifocal)" value="' + esc(V.buscaProd) + '"></label></div>' +
      '<div class="chips" style="margin-bottom:16px">' + CATEGORIAS.map(function (c) { return '<button class="chip" data-categoria-venda="' + c[0] + '" aria-pressed="' + (V.categoria === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<div id="v-grade">' + gradeProdutos() + '</div>';
  }

  /* ---------- passo 3: pagamento ---------- */
  function linhaPagamento(p, i) {
    var f = L.FORMAS[p.forma];
    var extra = '';
    if (p.forma === 'credito') extra = '<label class="campo"><span>Parcelas</span><select class="entrada" data-parcelas="' + i + '">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<option value="' + n + '"' + (p.parcelas === n ? ' selected' : '') + '>' + n + '× ' + (n > 1 ? R$(Math.ceil(p.valor / n)) : 'à vista') + '</option>'; }).join('') + '</select></label>';
    else if (p.forma === 'crediario') extra = '<label class="campo"><span>Parcelas</span><select class="entrada" data-parcelas="' + i + '">' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '"' + (p.parcelas === n ? ' selected' : '') + '>' + n + '× ' + R$(Math.ceil(p.valor / n)) + '</option>'; }).join('') + '</select></label>';
    else extra = '<span></span>';
    return '<div class="pagamento"><span class="nome-forma">' + ic(f.icone) + esc(f.nome) + '</span>' +
      '<label class="campo"><span>Valor</span><input class="entrada num" data-valor-pag="' + i + '" inputmode="decimal" value="' + esc(R$(p.valor).replace('R$ ', '')) + '" aria-label="Valor em ' + esc(f.nome) + '"></label>' + extra +
      '<button class="btn icone" data-remover-pag="' + i + '" aria-label="Remover ' + esc(f.nome) + '">' + ic('lixo') + '</button></div>';
  }
  function statusPagamento() {
    var c = conta();
    if (!V.itens.length) return '<p class="status-pagamento falta">' + ic('alerta') + 'Escolha ao menos um item.</p>';
    if (c.descontoAlto) return '<p class="status-pagamento erro">' + ic('alerta') + 'Desconto acima de ' + c.limite + '% precisa da aprovação do proprietário.</p>';
    var falta = faltaEstoque();
    if (falta) return '<p class="status-pagamento erro">' + ic('alerta') + esc(falta.produto.nome) + ': ' + (falta.produto.estoque > 0 ? 'só há ' + String(falta.produto.estoque).replace('.', ',') + ' em estoque' : 'sem estoque') + '. Ajuste a quantidade ou tire o item.</p>';
    if (V.pagamentos.some(function (p) { return p.forma === 'crediario'; }) && !V.clienteId) return '<p class="status-pagamento erro">' + ic('alerta') + 'Crediário precisa de cliente identificado. Volte ao passo 1.</p>';
    if (c.pag.erros.length) return '<p class="status-pagamento erro">' + ic('alerta') + esc(c.pag.erros[0]) + '</p>';
    if (c.pag.fechado) return '<p class="status-pagamento ok">' + ic('check') + 'Pagamento completo' + (c.pag.troco ? ' · troco de <strong class="num">' + R$(c.pag.troco) + '</strong>' : '') + '</p>';
    return '<p class="status-pagamento falta">' + ic('relogio') + 'Falta receber <strong class="num">' + R$(c.pag.falta) + '</strong>' + (V.pagamentos.length ? '. Escolha mais uma forma para dividir.' : '') + '</p>';
  }
  function etapaPagamento() {
    if (V.modo === 'orcamento') {
      return '<h3>Revisar orçamento</h3><p class="muted" style="margin-bottom:16px">O orçamento vale 7 dias. Quando o cliente aprovar, ele vira venda sem redigitar nada.</p>' +
        '<label class="campo"><span>Observações para o cliente</span><textarea class="entrada" id="v-notas" rows="3" placeholder="Ex.: gravar a data do casamento por dentro"></textarea></label>' +
        '<div class="folha-acoes"><button class="btn ouro lg" data-salvar-orcamento>' + ic('doc') + 'Salvar orçamento</button></div>';
    }
    return '<h3>Como vai pagar?</h3>' +
      '<div class="formas">' + Object.keys(L.FORMAS).map(function (k) { var f = L.FORMAS[k]; return '<button class="forma" data-forma="' + k + '">' + ic(f.icone) + esc(f.nome) + '<small>' + esc(f.nota) + '</small></button>'; }).join('') + '</div>' +
      '<div class="pagamentos" id="v-pagamentos">' + V.pagamentos.map(linhaPagamento).join('') + '</div>' +
      '<div id="v-status">' + statusPagamento() + '</div>' +
      '<div class="folha-acoes"><button class="btn" data-salvar-orcamento>' + ic('doc') + 'Salvar como orçamento</button><button class="btn ouro lg" data-concluir ' + (conta().pag.fechado && !bloqueios() ? '' : 'disabled') + '>' + ic('check') + 'Concluir venda <kbd>Ctrl ↵</kbd></button></div>';
  }
  function bloqueios() {
    var c = conta();
    return c.descontoAlto || (V.pagamentos.some(function (p) { return p.forma === 'crediario'; }) && !V.clienteId) || !!faltaEstoque();
  }
  /* Peça que não tem mais estoque suficiente (ex.: orçamento antigo de uma peça única que já foi vendida). */
  function faltaEstoque() {
    for (var n = 0; n < V.itens.length; n++) {
      var i = V.itens[n], p = L.prod(i.produtoId);
      if (p && p.estoque != null && !p.encomenda && !p.laboratorio && i.qtd > p.estoque) return { produto: p, item: i };
    }
    return null;
  }

  /* ---------- resumo lateral ---------- */
  function vinculo(item, idx) {
    var p = L.prod(item.produtoId), c = V.clienteId && L.cli(V.clienteId);
    var linhas = '';
    if (p.gera === 'otica') {
      var r = c && c.receita && Datas.diferencaDias(L.hoje, c.receita.validade) >= 0 ? 'receita ' + c.receita.tipo.toLowerCase() + ' de ' + Datas.curta(c.receita.data) : 'receita será anexada';
      linhas += '<span class="vinculo">' + ic('lab', 'sm') + 'Gera pedido de óculos · ' + esc(r) + '</span>';
    }
    if (p.gera === 'joia') linhas += '<span class="vinculo joia">' + ic('bancada', 'sm') + 'Gera serviço na bancada</span>';
    if (p.categoria === 'Anéis' || p.categoria === 'Alianças') {
      var aro = item.aro != null ? item.aro : (c && c.joia ? c.joia.aro : '');
      linhas += '<label class="vinculo joia">Aro <input class="entrada num" style="width:64px;min-height:30px;padding:0 6px;font-size:14px" data-aro="' + idx + '" value="' + esc(aro) + '" inputmode="numeric" aria-label="Aro do anel">' + (c && c.joia && item.aro == null ? '<span class="muted">da ficha</span>' : '') + '</label>';
    }
    return linhas;
  }
  function resumo() {
    var el = L.$('#resumo', folha);
    if (V.concluida) { el.hidden = true; return; }
    el.hidden = false;
    var c = conta(), cli = V.clienteId && L.cli(V.clienteId);
    var botao = V.passo === 1 ? '<button class="btn ouro lg bloco" data-ir-passo="2">Escolher itens' + ic('seta-dir') + '</button>'
      : V.passo === 2 ? '<button class="btn ouro lg bloco" data-ir-passo="3"' + (V.itens.length ? '' : ' disabled') + '>' + (V.modo === 'orcamento' ? 'Revisar orçamento' : 'Ir para pagamento') + ic('seta-dir') + '</button>'
      : V.modo === 'orcamento' ? '<button class="btn ouro lg bloco" data-salvar-orcamento>' + ic('doc') + 'Salvar orçamento</button>'
      : '<button class="btn ouro lg bloco" data-concluir' + (c.pag.fechado && !bloqueios() ? '' : ' disabled') + '>' + ic('check') + 'Concluir venda</button>';
    el.innerHTML =
      '<div class="resumo-cliente">' + (cli ? L.avatar(cli) + '<div style="min-width:0;flex:1"><strong style="display:block">' + esc(cli.nome) + '</strong><small class="muted num">' + esc(cli.telefone) + '</small></div>'
        : '<span class="avatar" style="--av:var(--muted)">' + ic('clientes', 'sm') + '</span><div style="flex:1"><strong style="display:block">' + (V.final ? 'Consumidor final' : 'Cliente não escolhido') + '</strong><small class="muted">' + (V.final ? 'Venda sem cadastro' : 'Passo 1') + '</small></div>') +
        '<button class="btn sm fantasma" data-ir-passo="1">' + (cli || V.final ? 'Trocar' : 'Escolher') + '</button></div>' +
      '<div class="resumo-itens">' + (V.itens.length ? V.itens.map(function (it, i) {
        var p = L.prod(it.produtoId);
        return '<div class="item-carrinho' + (it.novo ? ' novo' : '') + '"><div style="min-width:0"><strong>' + esc(p.nome) + '</strong><div class="muted num" style="font-size:var(--fs-sm)">' + R$(it.precoCentavos) + (it.qtd > 1 ? ' cada' : '') + '</div></div>' +
          '<strong class="num">' + R$(it.precoCentavos * it.qtd) + '</strong>' +
          '<div class="sub"><div style="display:grid;gap:4px">' + vinculo(it, i) + '</div><div style="display:flex;gap:6px;align-items:center"><span class="qtd"><button data-qtd="' + i + '" data-delta="-1" aria-label="Diminuir quantidade">' + ic('menos', 'sm') + '</button><output aria-live="polite">' + it.qtd + '</output><button data-qtd="' + i + '" data-delta="1" aria-label="Aumentar quantidade">' + ic('mais', 'sm') + '</button></span>' +
          '<button class="btn icone" data-remover-item="' + i + '" aria-label="Remover ' + esc(p.nome) + '">' + ic('lixo') + '</button></div></div></div>';
      }).join('') : '<div class="vazio" style="padding:28px 8px">' + ic('vendas', 'lg') + '<p>Os itens escolhidos aparecem aqui.</p></div>') + '</div>' +
      '<div class="resumo-total">' +
        '<button class="btn sm fantasma ver-itens" data-alternar-resumo style="justify-self:start;display:none">' + ic('baixo', 'sm') + 'Ver itens (' + c.pecas + ')</button>' +
        '<div class="linha"><span>Subtotal · ' + c.pecas + (c.pecas === 1 ? ' peça' : ' peças') + '</span><span>' + R$(c.subtotal) + '</span></div>' +
        '<div class="desconto-linha"><span style="flex:1;font-size:var(--fs-ui);color:var(--fg-2)">Desconto</span><span class="seg"><button data-tipo-desc="valor" aria-pressed="' + (V.desconto.tipo === 'valor') + '">R$</button><button data-tipo-desc="pct" aria-pressed="' + (V.desconto.tipo === 'pct') + '">%</button></span>' +
        '<input class="entrada num" id="v-desconto" inputmode="decimal" style="width:96px;text-align:right" aria-label="Desconto" value="' + (V.desconto.valor ? esc(V.desconto.tipo === 'pct' ? String(V.desconto.valor).replace('.', ',') : R$(V.desconto.valor).replace('R$ ', '')) : '') + '" placeholder="0"></div>' +
        '<div class="linha" id="v-desc-linha"' + (c.desconto ? '' : ' hidden') + '><span>Desconto aplicado</span><span style="color:var(--esmeralda-texto)" id="v-desc-valor">− ' + R$(c.desconto) + '</span></div>' +
        '<div class="grande"><span>Total</span><strong class="num" id="v-total">' + R$(c.total) + '</strong></div>' + botao + '</div>';
    var ver = L.$('.ver-itens', el);
    if (root.matchMedia('(max-width: 900px)').matches) ver.style.display = 'inline-flex';
    V.itens.forEach(function (i) { delete i.novo; });
  }

  /* Atualiza só números e status, sem redesenhar campos: o cursor não pula enquanto digita
     e o clique seguinte (ex.: outra forma de pagamento) não se perde num redesenho. */
  function atualizarParcial() {
    var c = conta();
    var dl = L.$('#v-desc-linha', folha);
    if (dl) { dl.hidden = !c.desconto; L.$('#v-desc-valor', folha).textContent = '− ' + R$(c.desconto); }
    L.$$('select[data-parcelas]', folha).forEach(function (sel) {
      var p = V.pagamentos[Number(sel.dataset.parcelas)];
      Array.prototype.forEach.call(sel.options, function (o) { var n = Number(o.value); o.textContent = n + '× ' + (n > 1 || p.forma === 'crediario' ? R$(Math.ceil(p.valor / n)) : 'à vista'); });
    });
    var tot = L.$('#v-total', folha);
    if (tot && tot.textContent !== R$(c.total)) { tot.textContent = R$(c.total); tot.classList.remove('mudou'); void tot.offsetWidth; tot.classList.add('mudou'); }
    var st = L.$('#v-status', folha);
    if (st) st.innerHTML = statusPagamento();
    L.$$('[data-concluir]', folha).forEach(function (b) { b.disabled = !(c.pag.fechado && !bloqueios()); });
  }

  /* ------------------------------ ações ------------------------------ */
  function adicionar(pid, silencioso) {
    var p = L.prod(pid);
    var atual = V.itens.find(function (i) { return i.produtoId === pid; });
    var controlaEstoque = p.estoque != null && !p.encomenda && !p.laboratorio;
    var qtd = (atual ? atual.qtd : 0) + 1;
    if (controlaEstoque && qtd > p.estoque) { L.toast('Só há ' + p.estoque + ' em estoque de ' + esc(p.nome) + '.', { icone: 'alerta' }); Som.tocar('erro'); return; }
    var preco = atual ? atual.precoCentavos : L.precoDe(p);
    if (!preco) { pedirPreco(p, function (v) { V.itens.push({ produtoId: pid, qtd: 1, precoCentavos: v, novo: true }); depoisDeAdicionar(); }); return; }
    if (atual) atual.qtd = qtd; else V.itens.push({ produtoId: pid, qtd: 1, precoCentavos: preco, novo: true });
    if (!silencioso) depoisDeAdicionar();
  }
  function depoisDeAdicionar() {
    if (!folha) return;
    Som.tocar('adicionar'); resumo();
    var g = L.$('#v-grade', folha);
    if (g) { g.innerHTML = gradeProdutos(); Motion.inclinar(folha); }
  }

  /* Peça sem preço (veio assim do sistema antigo): pergunta o valor desta venda.
     O proprietário pode guardar o valor no cadastro para a próxima vez. */
  function pedirPreco(p, pronto) {
    var dono = L.E.usuario.perfil === 'dono';
    var m = L.modal({
      titulo: 'Qual o preço desta peça?',
      corpo: '<p><strong>' + esc(p.nome) + '</strong> ' + (p.precoPorIndice ? 'tem índice ' + esc(String(p.indice).replace('.', ',')) + ' e ainda não tem preço calculado' : 'veio sem preço do sistema antigo') + '. Informe o valor desta venda.</p>' +
        '<label class="campo"><span>Preço (R$)</span><input class="entrada num" id="pp-valor" inputmode="decimal" autofocus placeholder="0,00"></label>' +
        (dono ? '<label class="marcar"><input type="checkbox" id="pp-guardar" checked> Guardar como preço da peça no cadastro</label>' : '') +
        '<p id="pp-erro" role="alert" style="color:var(--rubi-texto)"></p>',
      pe: '<button class="btn" data-nao>Cancelar</button><button class="btn ouro" data-sim>' + ic('mais') + 'Adicionar à venda</button>'
    });
    function confirmar() {
      var v = Dinheiro.lerReais(L.$('#pp-valor', m).value);
      if (!(v > 0)) { L.$('#pp-erro', m).textContent = 'Informe o preço, por exemplo 289,00.'; Som.tocar('erro'); return; }
      var guardar = L.$('#pp-guardar', m);
      if (guardar && guardar.checked) { p.precoCentavos = v; p.precoLocal = true; L.salvar(); }
      m.fechar();
      pronto(v);
    }
    m.querySelector('[data-sim]').addEventListener('click', confirmar);
    m.querySelector('[data-nao]').addEventListener('click', function () { m.fechar(); });
    L.$('#pp-valor', m).addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } });
  }

  function irPasso(n) {
    if (n === V.passo) return;
    if (n >= 3 && !V.itens.length) { V.passo = 2; Som.tocar('erro'); desenhar(true); L.toast('Escolha ao menos um item antes de seguir.', { icone: 'alerta' }); return; }
    // Ao chegar no pagamento sem forma escolhida, nada é presumido: o operador escolhe.
    Som.tocar(n > V.passo ? 'etapa' : 'setaVolta');
    V.passo = n;
    desenhar(true);
  }

  function aoClicar(e) {
    var t;
    if ((t = e.target.closest('[data-passo]'))) return irPasso(Number(t.dataset.passo));
    if ((t = e.target.closest('[data-ir-passo]'))) return irPasso(Number(t.dataset.irPasso));
    if ((t = e.target.closest('[data-escolher-cliente]'))) { V.clienteId = t.dataset.escolherCliente; V.final = false; Som.tocar('clique'); return irPasso(V.orcamentoId ? 3 : 2); }
    if ((t = e.target.closest('[data-consumidor-final]'))) { V.clienteId = null; V.final = true; V.pagamentos = V.pagamentos.filter(function (p) { return p.forma !== 'crediario'; }); return irPasso(2); }
    if ((t = e.target.closest('[data-cadastrar-na-venda]'))) {
      L.novoCliente(t.dataset.cadastrarNaVenda, function (novo) { V.clienteId = novo.id; V.final = false; V.passo = 2; desenhar(true); });
      return;
    }
    if ((t = e.target.closest('[data-categoria-venda]'))) { V.categoria = t.dataset.categoriaVenda; Som.tocar('clique'); L.$$('[data-categoria-venda]', folha).forEach(function (b) { if (b.classList.contains('chip')) b.setAttribute('aria-pressed', String(b.dataset.categoriaVenda === V.categoria)); }); L.$('#v-grade', folha).innerHTML = gradeProdutos(); Motion.inclinar(folha); return; }
    if ((t = e.target.closest('[data-add-produto]'))) return adicionar(t.dataset.addProduto);
    if ((t = e.target.closest('[data-qtd]'))) {
      var i = Number(t.dataset.qtd), d = Number(t.dataset.delta), it = V.itens[i], p = L.prod(it.produtoId);
      if (d > 0 && p.estoque != null && !p.encomenda && !p.laboratorio && it.qtd + 1 > p.estoque) { Som.tocar('erro'); L.toast('Só há ' + p.estoque + ' em estoque.', { icone: 'alerta' }); return; }
      it.qtd += d;
      Som.tocar(d > 0 ? 'seta' : 'setaVolta');
      if (it.qtd <= 0) V.itens.splice(i, 1);
      reajustarUnicoPagamento();
      resumo(); if (V.passo === 2) L.$('#v-grade', folha).innerHTML = gradeProdutos(); else if (V.passo === 3) etapa(false);
      return;
    }
    if ((t = e.target.closest('[data-remover-item]'))) { V.itens.splice(Number(t.dataset.removerItem), 1); Som.tocar('remover'); reajustarUnicoPagamento(); resumo(); if (V.passo === 2) L.$('#v-grade', folha).innerHTML = gradeProdutos(); else if (V.passo === 3) etapa(false); return; }
    if ((t = e.target.closest('[data-tipo-desc]'))) { V.desconto = { tipo: t.dataset.tipoDesc, valor: 0 }; Som.tocar('alternar'); reajustarUnicoPagamento(); resumo(); if (V.passo === 3) etapa(false); return; }
    if ((t = e.target.closest('[data-forma]'))) {
      var falta = conta().pag.falta;
      var forma = t.dataset.forma;
      if (forma === 'crediario' && !V.clienteId) { Som.tocar('erro'); L.toast('Crediário precisa de cliente identificado.', { icone: 'alerta', acao: { texto: 'Escolher cliente', fn: function () { irPasso(1); } } }); return; }
      if (!falta && forma !== 'dinheiro') { Som.tocar('erro'); L.toast('O total já está coberto. Ajuste os valores para dividir.', { icone: 'alerta' }); return; }
      V.pagamentos.push({ forma: forma, valor: falta, parcelas: forma === 'credito' ? 1 : forma === 'crediario' ? 3 : 1 });
      Som.tocar('adicionar');
      etapa(false); resumo();
      var campos = L.$$('[data-valor-pag]', folha); if (campos.length) campos[campos.length - 1].focus();
      return;
    }
    if ((t = e.target.closest('[data-remover-pag]'))) { V.pagamentos.splice(Number(t.dataset.removerPag), 1); Som.tocar('remover'); etapa(false); resumo(); return; }
    if ((t = e.target.closest('[data-alternar-resumo]'))) { L.$('#resumo', folha).classList.toggle('recolhido'); Som.tocar('clique'); return; }
    if (e.target.closest('[data-concluir]')) return concluir();
    if (e.target.closest('[data-salvar-orcamento]')) return salvarOrcamento();
    if ((t = e.target.closest('[data-pos]'))) return posAcao(t.dataset.pos);
  }

  /* Com uma forma só, o valor acompanha o total (desconto e quantidade mudando). */
  function reajustarUnicoPagamento() {
    if (V.pagamentos.length === 1 && V.pagamentos[0].forma !== 'dinheiro') V.pagamentos[0].valor = Venda.calcular(V.itens, V.desconto.valor > 0 ? V.desconto : null).total;
  }

  function aoDigitar(e) {
    var t = e.target;
    if (t.id === 'v-busca-cli') { V.buscaCli = t.value; L.$('#v-res-cli', folha).innerHTML = resultadosClientes(); return; }
    if (t.id === 'v-busca-prod') { V.buscaProd = t.value; L.$('#v-grade', folha).innerHTML = gradeProdutos(); Motion.inclinar(folha); return; }
    if (t.id === 'v-desconto') {
      var v = V.desconto.tipo === 'pct' ? Number(String(t.value).replace(',', '.')) || 0 : Dinheiro.lerReais(t.value) || 0;
      V.desconto.valor = Math.max(0, V.desconto.tipo === 'pct' ? Math.min(v, 100) : v);
      reajustarUnicoPagamento();
      atualizarParcial();
      L.$$('[data-valor-pag]', folha).forEach(function (inp, i) { if (document.activeElement !== inp) inp.value = R$(V.pagamentos[i].valor).replace('R$ ', ''); });
      return;
    }
    if (t.dataset.valorPag != null) { V.pagamentos[Number(t.dataset.valorPag)].valor = Dinheiro.lerReais(t.value) || 0; atualizarParcial(); return; }
    if (t.dataset.aro != null) { V.itens[Number(t.dataset.aro)].aro = t.value.replace(/\D/g, '').slice(0, 2); }
  }
  function aoMudar(e) {
    var t = e.target;
    if (t.dataset.parcelas != null) { V.pagamentos[Number(t.dataset.parcelas)].parcelas = Number(t.value); Som.tocar('clique'); }
    if (t.dataset.valorPag != null) t.value = R$(V.pagamentos[Number(t.dataset.valorPag)].valor).replace('R$ ', '');
  }
  function aoTeclar(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (V.concluida) return;
      if (V.passo < 3) irPasso(V.passo + 1);
      else if (V.modo === 'orcamento') salvarOrcamento();
      else if (conta().pag.fechado && !bloqueios()) concluir();
      else { Som.tocar('erro'); }
    }
    if (e.key === 'Enter' && e.target.id === 'v-busca-prod') {
      // Leitor de código de barras digita o SKU e manda Enter: adiciona direto se for exato.
      var q = e.target.value.trim().toUpperCase();
      var exato = L.D.produtos.find(function (p) { return p.sku === q; });
      if (exato) { e.preventDefault(); adicionar(exato.id); e.target.value = ''; V.buscaProd = ''; L.$('#v-grade', folha).innerHTML = gradeProdutos(); }
    }
  }

  /* ------------------------------ concluir ------------------------------ */
  function concluir() {
    var c = conta();
    var falta = faltaEstoque();
    if (falta) { Som.tocar('erro'); L.toast(esc(falta.produto.nome) + ' não tem estoque suficiente para concluir.', { icone: 'alerta' }); return; }
    if (!c.pag.fechado || bloqueios()) { Som.tocar('erro'); return; }
    var D = L.D, cli = V.clienteId && L.cli(V.clienteId);
    var numero = D.proximoNumero.venda++;
    var itens = V.itens.map(function (i) { return { produtoId: i.produtoId, qtd: i.qtd, precoCentavos: i.precoCentavos, aro: i.aro }; });
    var venda = {
      id: 'v' + numero, numero: numero, dia: L.hoje, hora: L.horaAgora(), clienteId: V.clienteId, vendedorId: L.E.usuario.id,
      itens: itens, descontoCentavos: c.desconto, totalCentavos: c.total, trocoCentavos: c.pag.troco,
      pagamentos: V.pagamentos.filter(function (p) { return p.valor > 0; }).map(function (p) { return { forma: p.forma, valor: p.forma === 'dinheiro' ? p.valor - c.pag.troco : p.valor, parcelas: p.parcelas }; })
    };
    D.vendas.push(venda);
    var efeitos = [];
    // estoque
    var baixadas = 0;
    itens.forEach(function (i) { var p = L.prod(i.produtoId); if (p.estoque != null && !p.encomenda && !p.laboratorio) { p.estoque = Math.max(0, p.estoque - i.qtd); baixadas += i.qtd; } });
    if (baixadas) efeitos.push({ icone: 'caixa', texto: 'Estoque atualizado: ' + baixadas + (baixadas === 1 ? ' peça baixada' : ' peças baixadas') });
    // pedidos
    var otica = itens.filter(function (i) { return L.prod(i.produtoId).segmento === 'otica'; });
    if (itens.some(function (i) { return L.prod(i.produtoId).gera === 'otica'; })) {
      var po = { id: 'p' + D.proximoNumero.pedido, numero: D.proximoNumero.pedido++, tipo: 'otica', clienteId: V.clienteId || 'c00', descricao: otica.map(function (i) { return L.prod(i.produtoId).nome; }).join(' + '), etapa: 'recebido', criado: L.hoje, prazo: Datas.somarDias(L.hoje, 7), parceiro: 'Laboratório Visão Norte', valorCentavos: otica.reduce(function (s, i) { return s + i.precoCentavos * i.qtd; }, 0) };
      if (V.clienteId) { D.pedidos.push(po); efeitos.push({ icone: 'lab', texto: 'Pedido de óculos ' + po.numero + ' aberto · prazo ' + Datas.curta(po.prazo) }); }
      else { D.proximoNumero.pedido--; efeitos.push({ icone: 'alerta', texto: 'Lente sem cliente identificado: cadastre o cliente para acompanhar o pedido no laboratório' }); }
    }
    var joias = itens.filter(function (i) { return L.prod(i.produtoId).gera === 'joia'; });
    if (joias.length && V.clienteId) {
      var encomenda = joias.some(function (i) { return L.prod(i.produtoId).encomenda; });
      var pj = { id: 'p' + D.proximoNumero.pedido, numero: D.proximoNumero.pedido++, tipo: 'joia', clienteId: V.clienteId, descricao: joias.map(function (i) { var p = L.prod(i.produtoId); return p.nome + (i.aro ? ' (aro ' + i.aro + ')' : ''); }).join(' + '), etapa: 'recebido', criado: L.hoje, prazo: Datas.somarDias(L.hoje, encomenda ? 20 : 5), parceiro: encomenda ? 'Ourivesaria parceira' : 'Bancada própria', valorCentavos: joias.reduce(function (s, i) { return s + i.precoCentavos * i.qtd; }, 0) };
      D.pedidos.push(pj);
      efeitos.push({ icone: 'bancada', texto: 'Serviço ' + pj.numero + ' na bancada · prazo ' + Datas.curta(pj.prazo) });
    }
    // crediário
    venda.pagamentos.forEach(function (p) {
      if (p.forma !== 'crediario') return;
      var parc = Venda.parcelas(p.valor, p.parcelas, Datas.somarDias(L.hoje, 30));
      parc.forEach(function (x) { D.financeiro.push({ id: 'f' + numero + '-' + x.numero, tipo: 'receber', descricao: 'Crediário · venda ' + numero + ' · parcela ' + x.numero + '/' + x.de, clienteId: V.clienteId, vencimento: x.vencimento, valorCentavos: x.valor, status: 'aberto' }); });
      efeitos.push({ icone: 'parcelas', texto: parc.length + '× de ' + R$(parc[0].valor) + ' no crediário, 1ª em ' + Datas.curta(parc[0].vencimento) });
    });
    if (c.pag.troco) efeitos.push({ icone: 'dinheiro', texto: 'Troco: ' + R$(c.pag.troco) });
    if (V.orcamentoId) {
      var q = D.orcamentos.find(function (x) { return x.id === V.orcamentoId; });
      q.status = 'convertido'; q.vendaId = venda.id;
      efeitos.push({ icone: 'doc', texto: 'Orçamento ' + q.numero + ' marcado como convertido' });
    }
    efeitos.push({ icone: 'check', texto: 'Recibo pronto para enviar' + (cli ? ' a ' + L.primeiroNome(cli.nome) : '') });
    L.salvar();
    V.concluida = { venda: venda, efeitos: efeitos };
    Som.tocar('sucesso');
    desenhar(true);
  }

  function telaSucesso() {
    var v = V.concluida.venda, cli = v.clienteId && L.cli(v.clienteId);
    return '<div class="sucesso"><canvas id="v-sucesso" aria-hidden="true"></canvas>' +
      '<p class="rotulo">Venda ' + v.numero + ' · ' + esc(v.hora) + '</p><h3>' + R$(v.totalCentavos) + (cli ? ' de ' + esc(L.primeiroNome(cli.nome)) : '') + '</h3>' +
      '<ul class="efeitos">' + V.concluida.efeitos.map(function (e, i) { return '<li style="--i:' + i + '">' + ic(e.icone) + '<span>' + esc(e.texto) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="folha-acoes" style="justify-content:center">' +
        '<a class="btn" href="' + L.wa(textoRecibo(v), cli) + '" target="_blank" rel="noopener" data-wa>' + ic('whats') + 'Enviar recibo</a>' +
        '<button class="btn" data-pos="recibo">' + ic('doc') + 'Ver recibo</button>' +
        '<button class="btn ouro" data-pos="nova">' + ic('vendas') + 'Nova venda</button>' +
        '<button class="btn fantasma" data-pos="fechar">Voltar</button></div></div>';
  }
  function posSucesso(el) {
    var c = L.$('#v-sucesso', el);
    if (c) L.registrarGema(Motion.sucesso(c), true);
  }
  function posAcao(a) {
    if (a === 'recibo') return L.verRecibo(V.concluida.venda);
    if (a === 'nova') { L.fecharCamada(camada, true); L.abrirVenda(); return; }
    L.fecharCamada(camada, true);
    L.atualizar();
  }

  function salvarOrcamento() {
    if (!V.itens.length) { Som.tocar('erro'); L.toast('Escolha ao menos um item para o orçamento.', { icone: 'alerta' }); return; }
    var c = conta(), D = L.D;
    var notas = L.$('#v-notas', folha);
    var q = { id: 'q' + D.proximoNumero.orcamento, numero: D.proximoNumero.orcamento++, clienteId: V.clienteId, vendedorId: L.E.usuario.id, criado: L.hoje, validade: Datas.somarDias(L.hoje, 7), itens: V.itens.map(function (i) { return { produtoId: i.produtoId, qtd: i.qtd, precoCentavos: i.precoCentavos }; }), descontoCentavos: c.desconto, status: 'aberto', notas: notas ? notas.value.trim() : '' };
    if (V.orcamentoId) { var antigo = D.orcamentos.find(function (x) { return x.id === V.orcamentoId; }); antigo.itens = q.itens; antigo.descontoCentavos = q.descontoCentavos; antigo.validade = q.validade; q = antigo; D.proximoNumero.orcamento--; }
    else D.orcamentos.push(q);
    L.salvar();
    V.concluida = true; // libera o fechamento sem perguntar
    L.fecharCamada(camada, true);
    Som.tocar('sucesso');
    L.toast('Orçamento ' + q.numero + ' salvo · vale até ' + Datas.curta(q.validade) + '.', { icone: 'doc', acao: { texto: 'Ver orçamentos', fn: function () { L.ir('vendas', 'orcamentos'); } } });
    if (L.E.rota === 'vendas') L.atualizar();
  }

  /* ------------------------------ recibo ------------------------------ */
  function textoRecibo(v) {
    var cli = v.clienteId && L.cli(v.clienteId), loja = L.D.loja;
    var linhas = [loja.nome.toUpperCase(), loja.cidade, '', 'Recibo da venda ' + v.numero, Datas.curta(v.dia) + '/' + v.dia.slice(0, 4) + ' às ' + v.hora, 'Cliente: ' + (cli ? cli.nome : 'Consumidor final'), ''];
    v.itens.forEach(function (i) { var p = L.prod(i.produtoId); linhas.push(i.qtd + '× ' + p.nome + (i.aro ? ' (aro ' + i.aro + ')' : '') + ' — ' + R$(i.precoCentavos * i.qtd)); });
    if (v.descontoCentavos) linhas.push('Desconto: − ' + R$(v.descontoCentavos));
    linhas.push('TOTAL: ' + R$(v.totalCentavos), '');
    v.pagamentos.forEach(function (p) { linhas.push(L.FORMAS[p.forma].nome + (p.parcelas > 1 ? ' ' + p.parcelas + '×' : '') + ': ' + R$(p.valor)); });
    if (v.trocoCentavos) linhas.push('Troco: ' + R$(v.trocoCentavos));
    linhas.push('', 'Documento de controle interno, não é nota fiscal.', 'Obrigado pela preferência!');
    return linhas.join('\n');
  }
  L.textoRecibo = textoRecibo;
  L.verRecibo = function (v) {
    var t = textoRecibo(v);
    var m = L.modal({
      titulo: 'Recibo da venda ' + v.numero,
      corpo: '<pre class="recibo" id="recibo-impressao">' + esc(t) + '</pre>',
      pe: '<button class="btn" data-copiar-recibo>' + ic('copiar') + 'Copiar</button>' + (L.emQuadro ? '' : '<button class="btn" data-imprimir>' + ic('imprimir') + 'Imprimir</button>') + '<a class="btn ouro" href="' + L.wa(t, v.clienteId && L.cli(v.clienteId)) + '" target="_blank" rel="noopener" data-wa>' + ic('whats') + 'Enviar</a>'
    });
    m.querySelector('[data-copiar-recibo]').addEventListener('click', function () { L.copiar(t, 'Recibo copiado.'); });
    var imp = m.querySelector('[data-imprimir]');
    if (imp) imp.addEventListener('click', function () { window.print(); });
  };
})(L);
