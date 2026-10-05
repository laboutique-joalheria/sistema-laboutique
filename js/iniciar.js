/* Inicialização: entrada por perfil, menu, barra superior, busca universal (Ctrl+K),
   pendências, tour de 3 passos, atalhos e sons globais. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic, R$ = L.R$;
  var MENU = [
    ['hoje', 'Hoje', 'hoje'], ['clientes', 'Clientes', 'clientes'], ['vendas', 'Vendas', 'vendas'], ['pedidos', 'Pedidos', 'pedidos'],
    ['produtos', 'Produtos', 'produtos'], ['financeiro', 'Financeiro', 'financeiro'], ['agenda', 'Agenda', 'agenda'], ['relatorios', 'Relatórios', 'relatorios']
  ];
  var gemaEntrada = null;

  /* ------------------------------ tema, som, efeitos ------------------------------ */
  function temaEfetivo() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  function iconeTema() {
    var escuro = temaEfetivo() === 'dark';
    var b = L.$('#alternar-tema');
    b.innerHTML = ic(escuro ? 'sol' : 'lua');
    b.setAttribute('aria-label', escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = escuro ? '#080C15' : '#EDF0F5';
  }
  L.definirTema = function (t) {
    if (t === 'sistema') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    try { if (t === 'sistema') localStorage.removeItem('lapidar.tema'); else localStorage.setItem('lapidar.tema', t); } catch (e) {}
    iconeTema(); L.retemaGemas(); if (gemaEntrada) gemaEntrada.retema();
    Som.tocar('alternar');
  };
  L.definirSom = function (on) {
    Som.definir(on);
    var b = L.$('#alternar-som');
    b.setAttribute('aria-pressed', String(on)); b.innerHTML = ic(on ? 'som' : 'mudo');
    b.setAttribute('aria-label', on ? 'Desligar sons' : 'Ligar sons');
  };
  L.definirEfeitos = function (on) {
    var d = document.documentElement;
    d.classList.toggle('efeitos-on', on); d.classList.toggle('efeitos-off', !on);
    try { localStorage.setItem('lapidar.efeitos', on ? '1' : '0'); } catch (e) {}
    var b = L.$('#alternar-efeitos');
    b.setAttribute('aria-pressed', String(on)); b.innerHTML = ic(on ? 'efeitos' : 'pausa');
    b.setAttribute('aria-label', on ? 'Pausar efeitos de movimento' : 'Ligar efeitos de movimento');
    L.reagendarGemas(); if (gemaEntrada) gemaEntrada.agendar();
    Som.tocar('alternar');
  };

  /* ------------------------------ entrada ------------------------------ */
  function telaEntrada() {
    var D = L.D;
    L.$('#perfis').innerHTML = D.equipe.map(function (u) {
      var p = D.perfis[u.perfil];
      return '<button class="perfil-op" data-entrar="' + u.id + '">' + L.avatar(u) + '<span><strong>' + esc(u.nome + ' ' + u.sobrenome) + ' · ' + esc(p.nome) + '</strong><small>' + esc(p.resumo) + '</small></span><svg class="ico seta" aria-hidden="true"><use href="#i-seta-dir"/></svg></button>';
    }).join('');
    L.$('#aviso-dados').textContent = L.importado() ? 'Cadastros da loja trazidos do G-Ótica, guardados só neste navegador.' : 'Dados fictícios. Nada aqui sai do seu navegador.';
    L.$('#entrada').hidden = false; L.$('#app').hidden = true;
    document.title = 'Lapidar · Joalheria & Ótica';
    if (!gemaEntrada) {
      gemaEntrada = new Motion.Gema(L.$('#gema-entrada'), {
        raios: true, giro: 0.3,
        // A pedra fica no espaço acima do título; no celular, menor e à direita da marca.
        layout: function (w, h) { return w < 700 ? { cx: 0.62, cy: 150 / h, escala: 0.2 } : { cx: 0.52, cy: 0.32, escala: Math.min(0.24, 260 / Math.min(w, h)) }; }
      });
    } else gemaEntrada.agendar();
  }

  function entrar(id) {
    L.E.usuario = L.usuario(id);
    try { sessionStorage.setItem('lapidar.usuario', id); } catch (e) {}
    if (gemaEntrada) { gemaEntrada.destruir(); gemaEntrada = null; }
    L.$('#entrada').hidden = true; L.$('#app').hidden = false;
    montarCasca();
    L.lerHash();
    L.render(true);
    L.atualizarSino();
    Som.tocar('sucesso');
    var feito = null;
    try { feito = localStorage.getItem('lapidar.tour'); } catch (e) {}
    if (!feito) setTimeout(L.tour, 900);
  }

  function sair() {
    try { sessionStorage.removeItem('lapidar.usuario'); history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    L.E.usuario = null; L.fecharTudo();
    L.E.gemas.forEach(function (g) { g.destruir(); }); L.E.gemas = [];
    Som.tocar('fechar');
    telaEntrada();
  }

  /* ------------------------------ casca ------------------------------ */
  function montarCasca() {
    var u = L.E.usuario, p = L.perfil();
    L.$('#loja-nome').textContent = L.D.loja.nome;
    L.$('#loja-unidade').textContent = L.D.loja.unidade + ' · ' + L.D.loja.cidade;
    L.$('#usuario-avatar').outerHTML = L.avatar(u).replace('class="avatar ', 'id="usuario-avatar" class="avatar ');
    L.$('#usuario-nome').textContent = u.nome + ' ' + u.sobrenome;
    L.$('#usuario-perfil').textContent = p.nome;
    L.$('#nav').innerHTML = MENU.filter(function (m) { return L.podeVer(m[0]); }).map(function (m) {
      return '<a class="nav-item" href="#' + m[0] + '" data-ir="' + m[0] + '" title="' + m[1] + '">' + ic(m[2]) + '<span>' + m[1] + '</span>' + (m[0] === 'hoje' ? '<span class="bolha" hidden></span>' : '') + '</a>';
    }).join('') + '<span style="height:12px"></span><a class="nav-item" href="#ajustes" data-ir="ajustes" title="Ajustes">' + ic('ajustes') + '<span>Ajustes</span></a>';
    var inferior = [['hoje', 'Hoje', 'hoje'], ['clientes', 'Clientes', 'clientes']];
    var direita = [['pedidos', 'Pedidos', 'pedidos']];
    L.$('#nav-inferior').innerHTML = inferior.filter(function (m) { return L.podeVer(m[0]); }).map(botaoInferior).join('') +
      (L.podeVender() ? '<button class="vender" data-acao="vender" aria-label="Vender">' + ic('vendas') + '</button>' : '<button data-ir="agenda">' + ic('agenda') + 'Agenda</button>') +
      direita.filter(function (m) { return L.podeVer(m[0]); }).map(botaoInferior).join('') +
      '<button data-acao="mais" aria-label="Mais telas">' + ic('lista') + 'Mais</button>';
    L.$('#vender-topo').hidden = !L.podeVender();
    iconeTema(); L.definirSomInicial(); L.definirEfeitosInicial();
    Motion.magnetico(L.$('#vender-topo'));
  }
  function botaoInferior(m) { return '<button data-ir="' + m[0] + '">' + ic(m[2]) + m[1] + '</button>'; }
  L.definirSomInicial = function () { var b = L.$('#alternar-som'), on = Som.ligado; b.setAttribute('aria-pressed', String(on)); b.innerHTML = ic(on ? 'som' : 'mudo'); b.setAttribute('aria-label', on ? 'Desligar sons' : 'Ligar sons'); };
  L.definirEfeitosInicial = function () { var b = L.$('#alternar-efeitos'), on = Motion.ativo(); b.setAttribute('aria-pressed', String(on)); b.innerHTML = ic(on ? 'efeitos' : 'pausa'); b.setAttribute('aria-label', on ? 'Pausar efeitos de movimento' : 'Ligar efeitos de movimento'); };

  function menuMais() {
    L.modal({ titulo: 'Mais', corpo: '<div style="display:grid;gap:6px">' + MENU.concat([['ajustes', 'Ajustes', 'ajustes']]).filter(function (x) { return L.podeVer(x[0]); }).map(function (x) {
      return '<button class="nav-item" data-ir="' + x[0] + '" style="border:1px solid var(--line)">' + ic(x[2]) + '<span>' + x[1] + '</span></button>';
    }).join('') + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn" data-acao="efeitos">' + ic('efeitos') + (Motion.ativo() ? 'Pausar efeitos' : 'Ligar efeitos') + '</button><button class="btn" data-acao="sair">' + ic('sair') + 'Trocar perfil</button></div>' });
  }

  /* ------------------------------ busca universal ------------------------------ */
  function acoes() {
    var lista = [];
    if (L.podeVender()) lista.push({ id: 'vender', titulo: 'Nova venda', sub: 'F2', icone: 'vendas', fn: function () { L.abrirVenda(); } }, { id: 'orc', titulo: 'Novo orçamento', sub: 'Cliente, itens e validade de 7 dias', icone: 'doc', fn: function () { L.abrirVenda({ modo: 'orcamento' }); } });
    lista.push({ id: 'cli', titulo: 'Cadastrar cliente', sub: 'Nome e WhatsApp bastam', icone: 'usuario-mais', fn: function () { L.novoCliente(''); } });
    lista.push({ id: 'ret', titulo: 'Registrar retirada', sub: 'Pedidos prontos', icone: 'retirada', fn: L.registrarRetirada });
    lista.push({ id: 'ag', titulo: 'Novo compromisso', sub: 'Agenda', icone: 'agenda', fn: function () { L.novoCompromisso({}); } });
    if (L.E.usuario.perfil === 'dono') lista.push({ id: 'imp', titulo: 'Trazer dados do G-Ótica', sub: 'Clientes e produtos dos relatórios em PDF', icone: 'baixar', fn: L.abrirImportacao });
    MENU.concat([['ajustes', 'Ajustes', 'ajustes']]).forEach(function (m) { if (L.podeVer(m[0])) lista.push({ id: 'ir-' + m[0], titulo: 'Ir para ' + m[1], sub: 'Tela', icone: m[2], fn: function () { L.ir(m[0]); } }); });
    lista.push({ id: 'tema', titulo: 'Alternar tema claro/escuro', sub: 'Aparência', icone: 'lua', fn: function () { L.definirTema(temaEfetivo() === 'dark' ? 'light' : 'dark'); } });
    return lista;
  }

  L.abrirBusca = function () {
    if (L.$('.paleta')) return;
    var el = document.createElement('div');
    el.className = 'paleta'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Busca universal');
    el.innerHTML = '<div class="linha-busca"><label class="busca-campo"><span class="sr">Buscar</span>' + ic('busca') + '<input class="entrada" id="paleta-campo" type="search" autofocus autocomplete="off" placeholder="Cliente, telefone, produto, pedido ou ação…" role="combobox" aria-expanded="true" aria-controls="paleta-res"></label></div>' +
      '<div class="paleta-res" id="paleta-res" role="listbox"></div><div class="paleta-pe"><span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span><span><kbd>↵</kbd> abrir</span><span><kbd>Esc</kbd> fechar</span></div>';
    var camada = L.abrirCamada(el, { classeVeu: 'paleta-veu' });
    Som.tocar('abrir');
    var campo = L.$('#paleta-campo', el), res = L.$('#paleta-res', el), opcoes = [], sel = 0;
    function grupo(nome, itens) { return itens.length ? '<div class="paleta-grupo rotulo">' + nome + '</div>' + itens.join('') : ''; }
    function op(o, i) { opcoes.push(o); return '<button class="paleta-op" role="option" data-op="' + (opcoes.length - 1) + '" aria-selected="false" style="--i:' + i + '"><span class="ico-caixa">' + (o.avatar || ic(o.icone)) + '</span><span style="min-width:0"><strong>' + esc(o.titulo) + '</strong><small>' + esc(o.sub || '') + '</small></span>' + ic('dir', 'ir sm') + '</button>'; }
    function desenhar() {
      var q = campo.value.trim(); opcoes = [];
      var html;
      if (!q) html = grupo('Ações rápidas', acoes().slice(0, 7).map(op));
      else {
        var cl = Busca.buscar(L.D.clientes, q, [{ chave: 'nome', peso: 3 }, { chave: 'telefone', telefone: true }, { chave: 'email' }], 5).map(function (c, i) { return op({ titulo: c.nome, sub: c.telefone + (L.stats(c.id).n ? ' · ' + R$(L.stats(c.id).total) + ' em compras' : ''), avatar: L.avatar(c).replace('class="avatar', 'style="width:32px;height:32px;font-size:11px" class="avatar'), fn: function () { L.abrirCliente(c.id, { semRota: true }); } }, i); });
        var pr = Busca.buscar(L.D.produtos, q, [{ chave: 'nome', peso: 3 }, { chave: 'sku', peso: 2 }, { chave: 'categoria' }, { chave: function (p) { return Object.values(p.atributos || {}).join(' '); }, peso: 0.6 }], 5).map(function (p, i) { return op({ titulo: p.nome, sub: L.precoTexto(p) + ' · ' + p.sku, icone: 'produtos', fn: function () { L.abrirProduto(p.id); } }, i); });
        var pe = L.D.pedidos.filter(function (p) { var c = L.cli(p.clienteId); return String(p.numero).indexOf(q.replace(/\D/g, '') || '¬') >= 0 || Busca.buscar([{ t: p.descricao + ' ' + (c ? c.nome : '') }], q, [{ chave: 't' }]).length; }).slice(0, 4)
          .map(function (p, i) { var c = L.cli(p.clienteId); return op({ titulo: 'Pedido ' + p.numero + ' · ' + (c ? c.nome : ''), sub: Pedidos.nomeEtapa(p.tipo, p.etapa) + ' · ' + p.descricao, icone: 'pedidos', fn: function () { L.E.destaque = p.id; L.ir('pedidos', p.tipo); } }, i); });
        var ac = Busca.buscar(acoes(), q, [{ chave: 'titulo', peso: 2 }, { chave: 'sub' }], 4).map(op);
        html = grupo('Clientes', cl) + grupo('Produtos', pr) + grupo('Pedidos', pe) + grupo('Ações', ac);
        if (!opcoes.length) {
          html = '<div class="sem-resultado"><h3>Não achamos “' + esc(q) + '”</h3><p>Confira a grafia, busque pelo telefone ou cadastre agora.</p></div>' + grupo('Ações', [op({ titulo: 'Cadastrar “' + q + '” como cliente', sub: 'Cadastro rápido', icone: 'usuario-mais', fn: function () { L.novoCliente(q); } }, 0)]);
        }
      }
      res.innerHTML = html; sel = 0; marcar();
    }
    function marcar() { L.$$('.paleta-op', res).forEach(function (b, i) { b.setAttribute('aria-selected', String(i === sel)); if (i === sel) b.scrollIntoView({ block: 'nearest' }); }); }
    function executar(i) { var o = opcoes[i]; if (!o) return; L.fecharCamada(camada, true); Som.tocar('clique'); setTimeout(o.fn, 10); }
    campo.addEventListener('input', desenhar);
    campo.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (sel < opcoes.length - 1) { sel++; marcar(); Som.tocar('seta'); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (sel > 0) { sel--; marcar(); Som.tocar('setaVolta'); } }
      else if (e.key === 'Enter') { e.preventDefault(); executar(sel); }
    });
    res.addEventListener('click', function (e) { var b = e.target.closest('[data-op]'); if (b) executar(Number(b.dataset.op)); });
    res.addEventListener('pointermove', function (e) { var b = e.target.closest('[data-op]'); if (b && Number(b.dataset.op) !== sel) { sel = Number(b.dataset.op); marcar(); } });
    desenhar();
  };

  /* ------------------------------ sino ------------------------------ */
  function abrirSino() {
    var at = L.atencao();
    if (window.matchMedia('(max-width: 760px)').matches) { L.modal({ titulo: 'Pendências', corpo: L.listaAtencao(at) }); return; }
    var el = document.createElement('div');
    el.className = 'popover'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Pendências');
    var r = L.$('#abrir-sino').getBoundingClientRect();
    el.style.top = (r.bottom + 8) + 'px'; el.style.right = Math.max(12, window.innerWidth - r.right - 8) + 'px';
    el.innerHTML = '<div class="painel-topo"><h2>Pendências</h2><span class="muted num">' + at.length + '</span></div>' + L.listaAtencao(at);
    L.abrirCamada(el, { classeVeu: 'transparente' });
    Som.tocar('abrir');
  }

  /* ------------------------------ tour ------------------------------ */
  L.tour = function () {
    var celular = window.matchMedia('(max-width: 760px)').matches;
    var passos = [
      { alvo: celular ? '#nav-inferior .vender' : '#vender-topo', titulo: 'Vender fica sempre aqui', texto: 'De qualquer tela, um toque abre a venda guiada: cliente, itens e pagamento. No teclado, F2.', so: L.podeVender() },
      { alvo: '#abrir-busca', titulo: 'Achou, abriu', texto: 'Busque cliente pelo nome ou telefone, produto pelo nome ou código, pedido pelo número. Erro de digitação não atrapalha. Atalho Ctrl K.' },
      { alvo: '#painel-atencao', titulo: 'O que fazer agora', texto: 'Atrasos, retiradas, parcelas e aniversários aparecem aqui com o próximo passo pronto, inclusive a mensagem de WhatsApp.' }
    ].filter(function (p) { return p.so !== false; });
    var i = 0, balao = null, foco = null;
    function limpar() { if (foco) foco.remove(); if (balao) balao.remove(); foco = balao = null; }
    function fim() { limpar(); document.removeEventListener('keydown', tecla, true); try { localStorage.setItem('lapidar.tour', '1'); } catch (e) {} }
    function tecla(e) { if (e.key === 'Escape') { e.stopPropagation(); fim(); } }
    function mostrar() {
      limpar();
      var p = passos[i], alvo = L.$(p.alvo);
      if (!alvo || !alvo.getClientRects().length) { if (++i < passos.length) mostrar(); else fim(); return; }
      alvo.scrollIntoView({ block: 'center', behavior: 'auto' });
      var ra = alvo.getBoundingClientRect();
      foco = document.createElement('div');
      foco.className = 'tour-foco';
      foco.style.cssText = 'top:' + (ra.top - 6) + 'px;left:' + (ra.left - 6) + 'px;width:' + (ra.width + 12) + 'px;height:' + (ra.height + 12) + 'px';
      document.body.appendChild(foco);
      balao = document.createElement('div');
      balao.className = 'tour-balao'; balao.setAttribute('role', 'dialog'); balao.setAttribute('aria-live', 'polite');
      balao.innerHTML = '<h3>' + esc(p.titulo) + '</h3><p>' + esc(p.texto) + '</p><div class="pe"><span class="muted">' + (i + 1) + ' de ' + passos.length + '</span><button class="btn sm fantasma" data-tour="pular">Pular</button><button class="btn sm ouro" data-tour="proximo">' + (i === passos.length - 1 ? 'Começar' : 'Próximo') + '</button></div>';
      document.body.appendChild(balao);
      var r = alvo.getBoundingClientRect(), b = balao.getBoundingClientRect();
      var top = r.bottom + 14 + b.height > window.innerHeight ? r.top - b.height - 14 : r.bottom + 14;
      var left = Math.min(Math.max(12, r.left + r.width / 2 - b.width / 2), window.innerWidth - b.width - 12);
      balao.style.top = Math.max(12, top) + 'px'; balao.style.left = left + 'px';
      balao.querySelector('[data-tour="proximo"]').focus();
      balao.addEventListener('click', function (e) {
        var a = e.target.closest('[data-tour]'); if (!a) return;
        if (a.dataset.tour === 'pular') { Som.tocar('fechar'); fim(); return; }
        Som.tocar('etapa');
        if (++i < passos.length) mostrar(); else fim();
      });
    }
    document.addEventListener('keydown', tecla, true);
    mostrar();
  };

  /* ------------------------------ eventos globais ------------------------------ */
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-entrar]'))) { entrar(t.dataset.entrar); return; }
    if ((t = e.target.closest('[data-atencao]'))) { L.fecharTudo(); L.executarAtencao(t.dataset.atencao); return; }
    if ((t = e.target.closest('[data-ir]'))) {
      e.preventDefault();
      if (L.E.camadas.length) L.fecharTudo();
      L.ir(t.dataset.ir, t.dataset.param || null);
      return;
    }
    if ((t = e.target.closest('[data-acao]'))) {
      var a = t.dataset.acao;
      if (a === 'vender') { L.fecharTudo(); L.abrirVenda(); }
      else if (a === 'orcamento') L.abrirVenda({ modo: 'orcamento' });
      else if (a === 'busca') L.abrirBusca();
      else if (a === 'retirada') L.registrarRetirada();
      else if (a === 'mais') menuMais();
      else if (a === 'efeitos') { L.fecharTudo(); L.definirEfeitos(!Motion.ativo()); }
      else if (a === 'sair') { L.fecharTudo(); sair(); }
      return;
    }
    if ((t = e.target.closest('[data-wa]'))) { Som.tocar('adicionar'); L.toast('Mensagem pronta no WhatsApp. Na demonstração, escolha o contato lá.', { icone: 'whats' }); return; }
  });

  // Clique genérico em botão: um "toc" discreto (ações com som próprio já tocaram o delas).
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest('button, a.btn, .nav-item');
    if (!b || b.disabled) return;
    if (b.matches('[data-mover], [data-qtd], [data-semana], [data-dia-cel], [data-add-produto], [data-forma], [data-ajuste], [data-ir], [data-entrar], [data-tour], [data-passo], [data-ir-passo]')) return;
    Som.tocar('clique');
  });

  document.addEventListener('keydown', function (e) {
    if (!L.E.usuario) return;
    var digitando = /input|select|textarea/i.test(e.target.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); L.abrirBusca(); return; }
    if (e.key === '/' && !digitando && !L.E.camadas.length) { e.preventDefault(); L.abrirBusca(); return; }
    if (e.key === 'F2') { e.preventDefault(); L.fecharTudo(); L.abrirVenda(); return; }
    if (e.key === 'Escape' && L.E.camadas.length) { e.preventDefault(); L.fecharCamada(); Som.tocar('fechar'); }
  });

  L.$('#abrir-busca').addEventListener('click', L.abrirBusca);
  L.$('#abrir-sino').addEventListener('click', abrirSino);
  L.$('#alternar-tema').addEventListener('click', function () { L.definirTema(temaEfetivo() === 'dark' ? 'light' : 'dark'); if (L.E.rota === 'ajustes') L.atualizar(); });
  L.$('#alternar-som').addEventListener('click', function () { L.definirSom(!Som.ligado); });
  L.$('#alternar-efeitos').addEventListener('click', function () { L.definirEfeitos(!Motion.ativo()); });
  L.$('#vender-topo').addEventListener('click', function () { L.abrirVenda(); });
  L.$('#sair').addEventListener('click', sair);
  window.addEventListener('popstate', function () { if (!L.E.usuario) return; L.fecharTudo(); L.lerHash(); L.render(true); });
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () { if (!document.documentElement.getAttribute('data-theme')) { iconeTema(); L.retemaGemas(); if (gemaEntrada) gemaEntrada.retema(); } });

  /* ------------------------------ partida ------------------------------ */
  L.carregar();
  var salvo = null;
  try { salvo = sessionStorage.getItem('lapidar.usuario'); } catch (e) {}
  if (salvo && L.usuario(salvo)) entrar(salvo); else telaEntrada();
})(L);
