/* PRODUTOS E ESTOQUE: catálogo comum, com os atributos certos para cada segmento
   (joia: metal, teor, peso, pedra; armação: medidas; lente: índice e tratamento). */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic, R$ = L.R$;
  var filtro = 'tudo', consulta = '', modo = 'grade';
  // Com o catálogo importado (mais de mil peças), a tela desenha aos poucos.
  var PASSO = 60, limite = PASSO;
  var CAMPOS = [{ chave: 'nome', peso: 3 }, { chave: 'sku', peso: 2 }, { chave: 'categoria', peso: 1 }, { chave: function (p) { return Object.values(p.atributos || {}).join(' '); }, peso: 0.6 }];
  var baixo = function (p) { return p.estoque != null && !p.encomenda && !p.laboratorio && p.minimo && p.estoque < p.minimo; };
  var FILTROS = [
    ['tudo', 'Tudo', function () { return true; }],
    ['joia', 'Joias', function (p) { return p.segmento === 'joia'; }],
    ['otica', 'Ótica', function (p) { return p.segmento === 'otica'; }],
    ['servico', 'Serviços', function (p) { return p.segmento === 'servico'; }, true],
    ['baixo', 'Estoque baixo', baixo],
    // Só aparecem quando há o que mostrar (catálogo importado).
    ['indice', 'Preço por índice', function (p) { return !!p.precoPorIndice && !p.precoCentavos; }, true],
    ['sem-preco', 'Sem preço', function (p) { return !L.precoDe(p) && p.estoque !== null; }, true],
    ['revisar', 'Revisar', function (p) { return !!p.revisar; }, true]
  ];

  function lista() {
    var f = FILTROS.find(function (x) { return x[0] === filtro; })[2];
    var base = L.D.produtos.filter(f);
    if (!consulta.trim()) return base;
    var r = Busca.buscar(base, consulta, CAMPOS, base.length || 1); // a paginação corta, a busca não
    if (!r.length && filtro !== 'tudo') r = Busca.buscar(L.D.produtos, consulta, CAMPOS, L.D.produtos.length || 1); // filtro nunca esconde o que existe
    return r;
  }

  function conteudo() {
    var todos = lista(), ps = todos.slice(0, limite);
    var mais = todos.length > ps.length ? '<div class="mostrar-mais"><span class="muted">Mostrando ' + ps.length + ' de ' + todos.length + '</span><button class="btn" data-mais-produtos>' + ic('baixo') + 'Mostrar mais ' + Math.min(PASSO, todos.length - ps.length) + '</button></div>' : '';
    if (!ps.length && !consulta.trim()) return '<div class="painel sem-resultado">' + ic('produtos', 'lg') + '<h3>Nada neste filtro</h3><p>Troque o filtro para ver o catálogo.</p></div>';
    if (!ps.length) return '<div class="painel sem-resultado">' + ic('busca', 'lg') + '<h3>Não achamos “' + esc(consulta) + '”</h3><p>Busque por uma palavra só (“aliança”, “multifocal”) ou pelo código SKU.</p></div>';
    if (modo === 'lista') {
      return '<section class="painel"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Produto</th><th>Categoria</th><th>SKU</th><th>Estoque</th><th class="valor">Preço</th></tr></thead><tbody>' +
        ps.map(function (p) { return '<tr data-produto="' + p.id + '" style="cursor:pointer"><td><strong>' + esc(p.nome) + '</strong></td><td>' + L.pilulaSegmento(p.segmento) + ' <small>' + esc(p.categoria) + '</small></td><td class="mono">' + esc(p.sku) + '</td><td>' + L.pilulaEstoque(p) + '</td><td class="valor"><strong>' + esc(L.precoTexto(p)) + '</strong></td></tr>'; }).join('') +
        '</tbody></table></div></section>' + mais;
    }
    return '<div class="grade-produtos">' + ps.map(function (p, i) {
      return '<button class="produto" data-seg="' + p.segmento + '" data-produto="' + p.id + '" style="--i:' + Math.min(i, 12) + '" data-inclinar>' +
        '<span class="arte">' + L.desenho(p.ilustracao) + '<span class="selo">' + L.pilulaSegmento(p.segmento) + '</span></span>' +
        '<span style="display:grid;gap:2px"><h3>' + esc(p.nome) + '</h3><span class="sku mono">' + esc(p.sku) + '</span></span>' +
        '<span class="pe"><span class="preco' + (L.precoDe(p) ? '' : ' sem') + '">' + esc(L.precoTexto(p)) + '</span>' + L.pilulaEstoque(p) + '</span></button>';
    }).join('') + '</div>' + mais;
  }

  L.telas.produtos = {
    titulo: 'Produtos',
    html: function () {
      var chips = FILTROS.map(function (f) { var n = L.D.produtos.filter(f[2]).length; if (f[3] && !n) return ''; return '<button class="chip" data-filtro-prod="' + f[0] + '" aria-pressed="' + (filtro === f[0]) + '">' + (f[0] === 'baixo' ? ic('alerta', 'sm') : '') + esc(f[1]) + ' <span class="cont">' + n + '</span></button>'; }).join('');
      return '<div class="cabeca"><div><h1>Produtos e estoque</h1><p>Joias, armações, lentes e serviços. Cada tipo com as medidas que importam.</p></div>' +
        '<div class="cabeca-acoes">' + (L.E.usuario.perfil === 'dono' ? '<button class="btn" data-novo-produto>' + ic('mais') + 'Novo produto</button>' : '') + '</div></div>' +
        '<div class="barra-ferramentas"><label class="busca-campo"><span class="sr">Buscar produto</span>' + ic('busca') + '<input class="entrada" id="busca-produtos" type="search" autocomplete="off" placeholder="Nome, código ou característica (ex.: 18k, 1.67)" value="' + esc(consulta) + '"></label>' +
        '<div class="chips">' + chips + '</div>' +
        '<span class="seg" style="margin-left:auto"><button data-modo-prod="grade" aria-pressed="' + (modo === 'grade') + '" aria-label="Ver em grade">' + ic('grade', 'sm') + '</button><button data-modo-prod="lista" aria-pressed="' + (modo === 'lista') + '" aria-label="Ver em lista">' + ic('lista', 'sm') + '</button></span></div>' +
        '<div id="produtos-conteudo">' + conteudo() + '</div>';
    },
    depois: function (v) {
      var campo = L.$('#busca-produtos', v);
      campo.addEventListener('input', function () { consulta = campo.value; limite = PASSO; L.$('#produtos-conteudo').innerHTML = conteudo(); Motion.inclinar(L.$('#produtos-conteudo')); });
      if (L.E.param && L.prod(L.E.param)) setTimeout(function () { L.abrirProduto(L.E.param); }, 60);
    }
  };

  /* Abre a lista já filtrada (ex.: da tela Hoje, "peças sem preço"). */
  L.filtrarProdutos = function (f) { filtro = f; consulta = ''; limite = PASSO; L.ir('produtos', null, { forcarAnimacao: true }); };

  L.abrirProduto = function (id) {
    var p = L.prod(id), dono = L.perfil().custo, preco = L.precoDe(p);
    var margem = p.custoCentavos && preco ? Math.round((preco - p.custoCentavos) / preco * 100) : null;
    var atributos = '<dl class="atributos">' + Object.keys(p.atributos || {}).map(function (k) { return '<dt>' + esc(k) + '</dt><dd class="' + (k === 'Medidas' || k === 'Índice' ? 'mono' : '') + '">' + esc(p.atributos[k]) + '</dd>'; }).join('') + '</dl>';
    var estoque = p.estoque == null || p.laboratorio || p.encomenda ? '' :
      '<div class="secao"><h3>Estoque</h3><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">' +
        '<span class="qtd"><button data-ajuste="-1" aria-label="Diminuir estoque">' + ic('menos', 'sm') + '</button><output id="estoque-valor" aria-live="polite">' + p.estoque + '</output><button data-ajuste="1" aria-label="Aumentar estoque">' + ic('mais', 'sm') + '</button></span>' +
        '<span class="muted">mínimo ' + p.minimo + '</span>' + L.pilulaEstoque(p) + '</div>' +
        (dono ? '<label class="campo" style="margin-top:12px"><span>Motivo do ajuste</span><select class="entrada" id="motivo-ajuste"><option>Entrada de mercadoria</option><option>Contagem (inventário)</option><option>Peça danificada</option><option>Devolução de cliente</option></select></label><button class="btn" style="margin-top:12px" data-salvar-estoque disabled>Salvar ajuste</button>' : '<p class="muted" style="font-size:var(--fs-sm);margin-top:8px">Ajustes de estoque ficam com o proprietário.</p>') + '</div>';
    var corpo = '<div class="produto" data-seg="' + p.segmento + '" style="cursor:default"><span class="arte" style="aspect-ratio:16/9">' + L.desenho(p.ilustracao) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap"><strong style="font-size:var(--fs-2xl)" class="num">' + esc(L.precoTexto(p)) + '</strong>' +
      (dono && p.custoCentavos && preco ? '<span class="muted num">custo ' + R$(p.custoCentavos) + ' · margem ' + margem + '%</span>' : '') + '</div>' +
      notaPreco(p, dono) +
      (L.podeVender() ? '<button class="btn ouro" data-vender-produto="' + p.id + '">' + ic('vendas') + 'Vender este produto</button>' : '') +
      '<div class="secao"><h3>Características</h3>' + atributos + '</div>' + estoque + L.secaoImportacao(p.importacao) +
      '<p class="muted mono" style="font-size:var(--fs-xs)">SKU ' + esc(p.sku) + ' · Imagem ilustrativa</p>';
    var g = L.gaveta({ rotulo: p.nome, topo: '<div><p class="rotulo">' + esc(p.categoria) + '</p><h2>' + esc(p.nome) + '</h2></div>', corpo: corpo });
    var novo = p.estoque;
    g.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ajuste]');
      if (a && dono) {
        novo = Math.max(0, Math.round((novo + Number(a.dataset.ajuste)) * 1000) / 1000); // estoque importado pode ser fracionado
        L.$('#estoque-valor', g).textContent = String(novo).replace('.', ',');
        L.$('[data-salvar-estoque]', g).disabled = novo === p.estoque;
        Som.tocar(Number(a.dataset.ajuste) > 0 ? 'seta' : 'setaVolta');
      } else if (a) { Som.tocar('erro'); }
      if (e.target.closest('[data-salvar-estoque]')) {
        var dif = Math.round((novo - p.estoque) * 1000) / 1000; p.estoque = novo; L.salvar();
        L.fecharCamada(null, true); Som.tocar('sucesso');
        L.toast('Estoque de ' + esc(p.nome) + ': ' + (dif > 0 ? '+' : '') + String(dif).replace('.', ',') + ' (' + esc(L.$('#motivo-ajuste') ? L.$('#motivo-ajuste').value : 'ajuste') + ').');
        if (L.E.rota === 'produtos') L.atualizar();
      }
      if (e.target.closest('[data-salvar-preco]')) {
        var novoPreco = Dinheiro.lerReais(L.$('#preco-peca', g).value);
        if (!(novoPreco > 0)) { Som.tocar('erro'); L.$('#preco-peca', g).focus(); return; }
        p.precoCentavos = novoPreco; p.precoLocal = true; L.salvar();
        L.fecharCamada(null, true); Som.tocar('sucesso');
        L.toast('Preço de ' + esc(p.nome) + ': ' + R$(novoPreco) + '.');
        if (L.E.rota === 'produtos') L.atualizar();
        return;
      }
      var v = e.target.closest('[data-vender-produto]');
      if (v) { L.fecharTudo(); L.abrirVenda({ produtoId: v.dataset.venderProduto }); }
    });
  };

  /* Peça sem preço no cadastro: explica de onde viria o preço e deixa o proprietário definir. */
  function notaPreco(p, dono) {
    if (p.precoCentavos > 0) return '';
    var v = L.D.config.valorIndiceCentavos;
    var texto = p.precoPorIndice
      ? (v ? 'Preço calculado: índice ' + esc(String(p.indice).replace('.', ',')) + ' × ' + R$(v) + ' (valor do índice em Ajustes).' : 'No sistema antigo esta peça tem preço 0 e índice ' + esc(String(p.indice).replace('.', ',')) + '. Defina o valor do índice em Ajustes ou o preço desta peça.')
      : 'Esta peça veio sem preço do sistema antigo.';
    return '<div class="status-pagamento falta" style="margin:0;display:grid;gap:10px">' + '<span style="display:flex;gap:10px;align-items:flex-start">' + ic('alerta') + '<span>' + texto + '</span></span>' +
      (dono ? '<span style="display:flex;gap:8px;flex-wrap:wrap"><input class="entrada num" id="preco-peca" inputmode="decimal" placeholder="Preço desta peça" aria-label="Preço desta peça" style="flex:1 1 140px;max-width:200px"><button class="btn" data-salvar-preco>' + ic('check') + 'Salvar preço</button></span>' : '') + '</div>';
  }

  /* Cadastro: os campos mudam com o segmento. Joia não pede medida de armação, lente não pede peso. */
  var CATS = { joia: ['Anéis', 'Alianças', 'Brincos', 'Colares', 'Pingentes', 'Pulseiras', 'Relógios'], otica: ['Armações', 'Óculos de sol', 'Lentes', 'Lentes de contato', 'Acessórios'], servico: ['Serviços'] };
  var DESENHO = { 'Anéis': 'anel', 'Alianças': 'aliancas', 'Brincos': 'brinco', 'Colares': 'colar', 'Pingentes': 'pingente', 'Pulseiras': 'pulseira', 'Relógios': 'relogio', 'Armações': 'armacao', 'Óculos de sol': 'sol', 'Lentes': 'lente', 'Lentes de contato': 'contato', 'Acessórios': 'frasco', 'Serviços': 'servico' };
  function camposSegmento(seg, cat) {
    var sel = function (id, rot, ops) { return '<label class="campo"><span>' + rot + '</span><select class="entrada" id="' + id + '">' + ops.map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></label>'; };
    var txt = function (id, rot, ph, cls) { return '<label class="campo"><span>' + rot + '</span><input class="entrada ' + (cls || '') + '" id="' + id + '" placeholder="' + (ph || '') + '"></label>'; };
    if (seg === 'joia') return sel('np-metal', 'Metal', ['Ouro amarelo 18k (750)', 'Ouro branco 18k (750)', 'Ouro rosé 18k (750)', 'Prata 925', 'Prata 950', 'Aço inoxidável']) + txt('np-peso', 'Peso (g)', '2,1', 'num') + txt('np-pedra', 'Pedra', 'Diamante 0,10 ct') + txt('np-aro', 'Aro / tamanho', '12 a 20');
    if (seg === 'otica' && (cat === 'Lentes')) return sel('np-indice', 'Índice', ['1.50', '1.56', '1.60', '1.67', '1.74']) + sel('np-tipo', 'Tipo', ['Visão simples', 'Multifocal', 'Bifocal', 'Ocupacional']) + txt('np-trat', 'Tratamento', 'Antirreflexo, filtro azul…');
    if (seg === 'otica') return '<label class="campo"><span>Medidas (aro □ ponte · haste)</span><span style="display:flex;gap:6px;align-items:center"><input class="entrada num" id="np-aro" placeholder="52" style="width:70px">□<input class="entrada num" id="np-ponte" placeholder="18" style="width:70px"><input class="entrada num" id="np-haste" placeholder="145" style="width:80px"></span></label>' + txt('np-material', 'Material', 'Acetato, metal, TR90') + txt('np-cor', 'Cor', 'Tartaruga');
    return txt('np-prazo', 'Prazo', '3 dias úteis');
  }
  L.novoProduto = function () {
    var seg = 'joia';
    var corpo = '<form id="form-produto" class="grade-form" novalidate>' +
      '<div class="campo inteiro"><span>Segmento</span><span class="seg" role="group" aria-label="Segmento">' + [['joia', 'Joia'], ['otica', 'Ótica'], ['servico', 'Serviço']].map(function (s) { return '<button type="button" data-seg-novo="' + s[0] + '" aria-pressed="' + (s[0] === seg) + '">' + s[1] + '</button>'; }).join('') + '</span></div>' +
      '<label class="campo inteiro"><span>Nome do produto *</span><input class="entrada" id="np-nome" required placeholder="Ex.: Anel solitário ouro 18k"></label>' +
      '<label class="campo"><span>Categoria</span><select class="entrada" id="np-cat"></select></label>' +
      '<label class="campo"><span>Preço de venda *</span><input class="entrada num" id="np-preco" inputmode="decimal" placeholder="0,00"></label>' +
      '<label class="campo"><span>Custo</span><input class="entrada num" id="np-custo" inputmode="decimal" placeholder="0,00"></label>' +
      '<label class="campo"><span>Estoque inicial</span><input class="entrada num" id="np-estoque" inputmode="numeric" value="1"></label>' +
      '<label class="campo"><span>Estoque mínimo</span><input class="entrada num" id="np-minimo" inputmode="numeric" value="1"></label>' +
      '<div class="grade-form inteiro" id="np-especificos"></div><p class="inteiro" id="np-erro" role="alert" style="color:var(--rubi-texto)"></p></form>';
    var g = L.gaveta({ rotulo: 'Novo produto', topo: '<div><p class="rotulo">Catálogo</p><h2>Novo produto</h2></div>', corpo: corpo,
      pe: '<button class="btn" data-cancelar>Cancelar</button><button class="btn ouro" type="submit" form="form-produto">' + ic('check') + 'Cadastrar produto</button>' });
    function montar() {
      L.$('#np-cat', g).innerHTML = CATS[seg].map(function (c) { return '<option>' + c + '</option>'; }).join('');
      L.$('#np-especificos', g).innerHTML = camposSegmento(seg, L.$('#np-cat', g).value);
      L.$$('[data-seg-novo]', g).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.segNovo === seg)); });
    }
    montar();
    L.$('#np-cat', g).addEventListener('change', function () { L.$('#np-especificos', g).innerHTML = camposSegmento(seg, this.value); });
    g.addEventListener('click', function (e) {
      var b = e.target.closest('[data-seg-novo]');
      if (b) { seg = b.dataset.segNovo; montar(); Som.tocar('alternar'); }
      if (e.target.closest('[data-cancelar]')) L.fecharCamada();
    });
    L.$('#form-produto', g).addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = L.$('#np-nome', g).value.trim(), preco = Dinheiro.lerReais(L.$('#np-preco', g).value);
      var erro = !nome ? 'Informe o nome.' : !(preco > 0) ? 'Informe o preço de venda, por exemplo 289,00.' : '';
      if (erro) { L.$('#np-erro', g).textContent = erro; Som.tocar('erro'); return; }
      var cat = L.$('#np-cat', g).value, at = {};
      var v = function (id) { var el = L.$('#' + id, g); return el ? el.value.trim() : ''; };
      if (seg === 'joia') { at.Metal = v('np-metal'); if (v('np-peso')) at.Peso = v('np-peso') + ' g'; if (v('np-pedra')) at.Pedra = v('np-pedra'); if (v('np-aro')) at.Aro = v('np-aro'); }
      else if (cat === 'Lentes') { at['Índice'] = v('np-indice'); at.Tipo = v('np-tipo'); if (v('np-trat')) at.Tratamento = v('np-trat'); }
      else if (seg === 'otica') { if (v('np-aro')) at.Medidas = v('np-aro') + '□' + v('np-ponte') + ' ' + v('np-haste'); if (v('np-material')) at.Material = v('np-material'); if (v('np-cor')) at.Cor = v('np-cor'); }
      else if (v('np-prazo')) at.Prazo = v('np-prazo');
      var sigla = Busca.normalizar(nome).split(' ').slice(0, 3).map(function (p) { return p.slice(0, 3).toUpperCase(); }).join('-');
      var p = {
        id: 'n' + Date.now().toString(36), nome: nome, segmento: seg, categoria: cat, sku: sigla + '-' + String(L.D.produtos.length + 1).padStart(3, '0'),
        precoCentavos: preco, custoCentavos: Dinheiro.lerReais(L.$('#np-custo', g).value) || 0,
        estoque: seg === 'servico' ? null : Number(L.$('#np-estoque', g).value) || 0, minimo: Number(L.$('#np-minimo', g).value) || 0,
        laboratorio: cat === 'Lentes', gera: cat === 'Lentes' ? 'otica' : seg === 'servico' ? 'joia' : null, ilustracao: DESENHO[cat] || 'servico', atributos: at
      };
      L.D.produtos.push(p); L.salvar();
      L.fecharCamada(null, true); Som.tocar('sucesso');
      L.toast('Produto <strong>' + esc(nome) + '</strong> cadastrado.', { acao: { texto: 'Abrir', fn: function () { L.abrirProduto(p.id); } } });
      filtro = 'tudo'; consulta = '';
      if (L.E.rota === 'produtos') L.atualizar();
    });
  };

  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-filtro-prod]'))) { filtro = t.dataset.filtroProd; limite = PASSO; L.atualizar(); return; }
    if (e.target.closest('[data-mais-produtos]')) { limite += PASSO; Som.tocar('seta'); L.$('#produtos-conteudo').innerHTML = conteudo(); Motion.inclinar(L.$('#produtos-conteudo')); return; }
    if ((t = e.target.closest('[data-modo-prod]'))) { modo = t.dataset.modoProd; Som.tocar('alternar'); L.atualizar(); return; }
    if ((t = e.target.closest('[data-produto]'))) { L.abrirProduto(t.dataset.produto); return; }
    if (e.target.closest('[data-novo-produto]')) L.novoProduto();
  });
})(L);
