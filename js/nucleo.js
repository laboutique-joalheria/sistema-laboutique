/* Núcleo do Lapidar: estado, persistência, rotas, camadas (gaveta, modal, folha), avisos e utilidades.
   As telas ficam em js/telas/*.js e se registram em L.telas. Regras de negócio NÃO moram aqui:
   ficam em js/regras/*.js, testadas no Node. */
(function (root) {
  'use strict';
  var L = root.L = { telas: {} };

  /* ------------------------------ utilidades ------------------------------ */
  L.$ = function (s, r) { return (r || document).querySelector(s); };
  L.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  L.esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  L.ic = function (nome, cls) { return '<svg class="ico ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + nome + '"/></svg>'; };
  L.desenho = function (nome) { return '<svg viewBox="0 0 120 90" aria-hidden="true"><use href="#d-' + nome + '"/></svg>'; };
  L.R$ = Dinheiro.formatar;
  L.hoje = Datas.hoje();
  L.emQuadro = (function () { try { return root.self !== root.top; } catch (e) { return true; } })();

  L.iniciais = function (nome) {
    return String(nome || '?').split(' ').filter(function (p) { return p.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(p); }).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  };
  var CORES_AV = ['var(--safira)', 'var(--ametista)', 'var(--ouro)', 'var(--esmeralda)', 'var(--citrino)'];
  L.corAvatar = function (id) {
    var h = 0; String(id).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) | 0; });
    return CORES_AV[Math.abs(h) % CORES_AV.length];
  };
  L.avatar = function (pessoa, cls) {
    return '<span class="avatar ' + (cls || '') + '" style="--av:' + L.corAvatar(pessoa ? pessoa.id : 'x') + '" aria-hidden="true">' + L.esc(pessoa ? L.iniciais(pessoa.nome) : 'CF') + '</span>';
  };
  L.primeiroNome = function (n) { return String(n || '').split(' ')[0]; };

  /* WhatsApp: o link só leva o número de cliente que veio do cadastro da loja (importado).
     Cliente de exemplo tem telefone inventado: o link abre sem número, para nunca escrever a um estranho. */
  var DEMO_CLIENTES = {};
  (root.DadosDemo && DadosDemo.clientes || []).forEach(function (c) { DEMO_CLIENTES[c.id] = 1; });
  L.wa = function (texto, cliente) {
    var real = cliente && L.D && L.D.importacao && L.D.importacao.clientes && !DEMO_CLIENTES[cliente.id];
    var d = real ? String(cliente.telefone || '').replace(/\D/g, '') : '';
    var num = d.length === 10 || d.length === 11 ? '55' + d : '';
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(texto);
  };
  L.linkWa = function (texto, rotulo, cls, cliente) {
    return '<a class="btn ' + (cls || 'sm') + '" href="' + L.wa(texto, cliente) + '" target="_blank" rel="noopener" data-wa>' + L.ic('whats') + L.esc(rotulo || 'WhatsApp') + '</a>';
  };

  L.horaAgora = function () {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: Datas.FUSO, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  };
  L.saudacao = function () {
    var h = Number(L.horaAgora().slice(0, 2));
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  };
  L.FORMAS = {
    pix: { nome: 'PIX', icone: 'pix', nota: 'Na hora' },
    credito: { nome: 'Crédito', icone: 'cartao', nota: 'Até 10× sem juros' },
    debito: { nome: 'Débito', icone: 'cartao', nota: 'Na hora' },
    dinheiro: { nome: 'Dinheiro', icone: 'dinheiro', nota: 'Calcula o troco' },
    crediario: { nome: 'Crediário', icone: 'parcelas', nota: 'Parcelas da loja' }
  };

  /* ------------------------------ dados ------------------------------ */
  var CHAVE = 'lapidar.dados.v1';
  function clonar(o) { return JSON.parse(JSON.stringify(o)); }
  var CHAVE_VERSAO = 'lapidar.versao';
  function lerVersao() { try { return localStorage.getItem(CHAVE_VERSAO); } catch (e) { return null; } }
  L.carregar = function () {
    var semente = DadosDemo, salvo = null;
    L._versao = lerVersao();
    try { salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { salvo = null; }
    // Os exemplos são montados em torno de "hoje": num dia novo, recomeça para continuar fazendo sentido.
    // Cadastros importados da loja nunca recomeçam sozinhos.
    var manter = salvo && (salvo.origem === 'importado' || salvo.hoje === semente.hoje);
    L.D = manter ? salvo : clonar(semente);
    L.D.config = L.D.config || {};
    if (!L.D.caixa) L.D.caixa = { aberto: true, fundo: 20000, movimentos: [], fechado: null };
    // O caixa é do dia: num dia novo abre de novo com o mesmo fundo de troco; o de ontem vai para o histórico.
    if (!L.D.caixa.dia) L.D.caixa.dia = L.hoje;
    else if (L.D.caixa.dia !== L.hoje) {
      L.D.caixasAnteriores = (L.D.caixasAnteriores || []).concat([L.D.caixa]).slice(-90);
      L.D.caixa = { aberto: true, fundo: L.D.caixa.fundo, movimentos: [], fechado: null, dia: L.hoje };
    }
    L.indexar();
  };
  /* Devolve false quando o navegador não guardou (sem espaço ou bloqueado): os dados seguem na memória.
     Se outra aba gravou depois que esta carregou, não escreve por cima: recarrega e avisa.
     opcoes.forcar: troca a base inteira de propósito (importar, voltar aos exemplos). */
  L.salvar = function (opcoes) {
    var ok = true;
    if (!(opcoes && opcoes.forcar) && lerVersao() !== L._versao) { recarregarDeOutraAba(); return false; }
    try {
      localStorage.setItem(CHAVE, JSON.stringify(L.D));
      L._versao = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      localStorage.setItem(CHAVE_VERSAO, L._versao);
    } catch (e) { ok = false; }
    L.indexar();
    L.atualizarSino();
    return ok;
  };
  function recarregarDeOutraAba() {
    L.carregar();
    if (!L.E.usuario) return;
    L.fecharTudo(); L.atualizar(); L.atualizarSino();
    L.toast('Os dados mudaram em outra aba. Esta tela foi atualizada; confira e refaça a última alteração, se for o caso.', { icone: 'alerta', tempo: 9000 });
  }
  root.addEventListener('storage', function (e) {
    if (e.key === CHAVE_VERSAO || e.key === CHAVE || e.key === null) recarregarDeOutraAba();
  });
  L.restaurar = function () {
    L.D = clonar(DadosDemo);
    L.D.caixa = { aberto: true, fundo: 20000, movimentos: [], fechado: null, dia: L.hoje };
    L.D.config = L.D.config || {};
    L.salvar({ forcar: true }); // avisa as outras abas também
  };
  L.importado = function () { return L.D.origem === 'importado'; };

  /* Preço por índice: no G-Ótica, muitas joias têm preço 0 e um índice. A hipótese (a confirmar com
     a loja) é preço = índice × valor do índice, um valor que a loja define e atualiza. */
  L.precoDe = function (p) {
    if (p.precoCentavos > 0) return p.precoCentavos;
    var v = L.D.config && L.D.config.valorIndiceCentavos;
    if (p.precoPorIndice && p.indice > 0 && v > 0) return Math.round(p.indice * v);
    return 0;
  };
  L.precoTexto = function (p) {
    var v = L.precoDe(p);
    if (v) return L.R$(v);
    if (p.precoPorIndice) return 'Índice ' + String(p.indice).replace('.', ',');
    return 'Sem preço';
  };
  L.indexar = function () {
    var D = L.D;
    L._cli = {}; D.clientes.forEach(function (c) { L._cli[c.id] = c; });
    L._prod = {}; D.produtos.forEach(function (p) { L._prod[p.id] = p; });
    L._usu = {}; D.equipe.forEach(function (u) { L._usu[u.id] = u; });
    L._stats = null;
  };
  L.cli = function (id) { return L._cli[id] || null; };
  L.prod = function (id) { return L._prod[id] || null; };
  L.usuario = function (id) { return L._usu[id] || null; };

  /* Totais por cliente, calculados uma vez por mudança de dados. */
  L.stats = function (id) {
    if (!L._stats) {
      L._stats = {};
      L.D.vendas.forEach(function (v) {
        if (!v.clienteId) return;
        var s = L._stats[v.clienteId] || (L._stats[v.clienteId] = { total: 0, n: 0, ultima: null });
        s.total += v.totalCentavos; s.n++;
        if (!s.ultima || v.dia > s.ultima) s.ultima = v.dia;
      });
    }
    return L._stats[id] || { total: 0, n: 0, ultima: null };
  };
  L.emAberto = function (clienteId) {
    return L.D.financeiro.filter(function (f) { return f.tipo === 'receber' && f.status === 'aberto' && f.clienteId === clienteId; })
      .reduce(function (s, f) { return s + f.valorCentavos; }, 0);
  };
  L.atencao = function () { return Atencao.listar(L.D, L.hoje); };

  /* ------------------------------ perfil ------------------------------ */
  L.perfil = function () { return L.D.perfis[L.E.usuario.perfil]; };
  L.podeVer = function (tela) { return L.E.usuario && L.perfil().telas.indexOf(tela) >= 0; };
  L.podeVender = function () { return L.podeVer('vendas'); };

  /* ------------------------------ estado ------------------------------ */
  L.E = { usuario: null, rota: 'hoje', param: null, camadas: [], gemas: [] };

  /* ------------------------------ rotas ------------------------------ */
  /* URL própria por tela (#clientes, #clientes.c03): o voltar do navegador funciona e dá para
     mandar o link de uma ficha. No sistema antigo tudo ficava em /login. */
  L.ir = function (rota, param, opcoes) {
    opcoes = opcoes || {};
    if (!L.telas[rota] || !L.podeVer(rota)) rota = 'hoje';
    var mudouTela = rota !== L.E.rota;
    L.E.rota = rota; L.E.param = param || null;
    var hash = '#' + rota + (param ? '.' + param : '');
    if (location.hash !== hash) {
      try { history.pushState(null, '', hash); } catch (e) { /* quadro sem histórico: segue sem URL */ }
    }
    L.fecharTudo();
    L.render(mudouTela || opcoes.forcarAnimacao);
    if (mudouTela && opcoes.som !== false) Som.tocar('navegar');
  };
  L.lerHash = function () {
    var h = decodeURIComponent((location.hash || '').slice(1));
    var partes = h.split('.');
    if (L.telas[partes[0]] && L.podeVer(partes[0])) { L.E.rota = partes[0]; L.E.param = partes[1] || null; }
    else { L.E.rota = 'hoje'; L.E.param = null; }
  };

  L.render = function (animar) {
    var tela = L.telas[L.E.rota];
    var vista = L.$('#vista');
    L.E.gemas.forEach(function (g) { if (g.local) g.destruir(); });
    L.E.gemas = L.E.gemas.filter(function (g) { return !g.local; });
    vista.innerHTML = tela.html();
    L.$$('#nav [data-ir], #nav-inferior [data-ir]').forEach(function (b) {
      if (b.dataset.ir === L.E.rota) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    L.$('#titulo-pag').textContent = tela.titulo;
    document.title = tela.titulo + ' · Lapidar';
    L.$$('#vista > *').forEach(function (el, i) { el.style.setProperty('--i', i); });
    if (animar) {
      vista.classList.remove('entrando'); void vista.offsetWidth; vista.classList.add('entrando');
      // Tira a classe quando a entrada termina: nada fica preso no estado da animação.
      clearTimeout(L._fimEntrada);
      L._fimEntrada = setTimeout(function () { vista.classList.remove('entrando'); }, 1500);
      root.scrollTo({ top: 0 });
      vista.focus({ preventScroll: true });
    }
    if (tela.depois) tela.depois(vista);
    Motion.inclinar(vista);
    Motion.revelar(vista);
    Motion.contar(vista, L.R$);
  };
  // Atualiza a tela atual sem animação de entrada (ex.: depois de mover um cartão).
  L.atualizar = function () { L.render(false); };

  /* ------------------------------ camadas ------------------------------ */
  /* Cada camada aberta empilha; Esc fecha a de cima e o foco volta para quem abriu. */
  L.abrirCamada = function (el, opcoes) {
    opcoes = opcoes || {};
    var c = { el: el, veu: null, origem: document.activeElement, aoFechar: opcoes.aoFechar, antesDeFechar: opcoes.antesDeFechar };
    if (opcoes.veu !== false) {
      c.veu = document.createElement('div');
      c.veu.className = 'veu ' + (opcoes.classeVeu || '');
      c.veu.addEventListener('click', function () { L.fecharCamada(c); });
      L.$('#camadas').appendChild(c.veu);
    }
    L.$('#camadas').appendChild(el);
    L.E.camadas.push(c);
    document.body.style.overflow = 'hidden';
    var foco = el.querySelector('[autofocus]') || el.querySelector('input, button, [href], select, textarea');
    if (foco) setTimeout(function () { foco.focus({ preventScroll: true }); }, 30);
    return c;
  };
  L.fecharCamada = function (c, forcar) {
    c = c || L.E.camadas[L.E.camadas.length - 1];
    if (!c) return;
    if (!forcar && c.antesDeFechar && c.antesDeFechar() === false) return;
    L.E.camadas = L.E.camadas.filter(function (x) { return x !== c; });
    c.el.remove(); if (c.veu) c.veu.remove();
    if (c.aoFechar) c.aoFechar();
    if (!L.E.camadas.length) document.body.style.overflow = '';
    if (c.origem && c.origem.focus && document.contains(c.origem)) c.origem.focus({ preventScroll: true });
  };
  L.fecharTudo = function () { while (L.E.camadas.length) L.fecharCamada(null, true); };

  L.gaveta = function (opcoes) {
    var el = document.createElement('aside');
    el.className = 'gaveta';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', opcoes.rotulo || 'Detalhes');
    el.innerHTML = '<header class="gaveta-topo">' + opcoes.topo + '<button class="btn icone" data-fechar aria-label="Fechar" style="margin-left:auto">' + L.ic('fechar') + '</button></header>' +
      '<div class="gaveta-corpo">' + opcoes.corpo + '</div>' + (opcoes.pe ? '<footer class="gaveta-pe">' + opcoes.pe + '</footer>' : '');
    el.querySelector('[data-fechar]').addEventListener('click', function () { L.fecharCamada(camada); Som.tocar('fechar'); });
    var camada = L.abrirCamada(el, opcoes);
    Som.tocar('abrir');
    return el;
  };

  L.modal = function (opcoes) {
    var el = document.createElement('div');
    el.className = 'modal';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', opcoes.titulo);
    el.innerHTML = '<header class="modal-topo"><h2>' + L.esc(opcoes.titulo) + '</h2><button class="btn icone" data-fechar aria-label="Fechar">' + L.ic('fechar') + '</button></header>' +
      '<div class="modal-corpo">' + opcoes.corpo + '</div>' + (opcoes.pe ? '<footer class="modal-pe">' + opcoes.pe + '</footer>' : '');
    var camada = L.abrirCamada(el, Object.assign({ classeVeu: 'alto' }, opcoes));
    el.querySelector('[data-fechar]').addEventListener('click', function () { L.fecharCamada(camada); });
    el.fechar = function () { L.fecharCamada(camada, true); };
    return el;
  };

  /* Confirmação dentro da página (o navegador da prévia bloqueia confirm()). */
  L.confirmar = function (opcoes) {
    return new Promise(function (resolve) {
      var respondeu = false;
      var m = L.modal({
        titulo: opcoes.titulo,
        corpo: '<p>' + opcoes.texto + '</p>',
        pe: '<button class="btn" data-nao>' + L.esc(opcoes.cancelar || 'Voltar') + '</button><button class="btn ' + (opcoes.perigo ? 'perigo' : 'ouro') + '" data-sim>' + L.esc(opcoes.ok || 'Confirmar') + '</button>',
        aoFechar: function () { if (!respondeu) resolve(false); }
      });
      m.querySelector('[data-sim]').addEventListener('click', function () { respondeu = true; m.fechar(); resolve(true); });
      m.querySelector('[data-nao]').addEventListener('click', function () { respondeu = true; m.fechar(); resolve(false); });
    });
  };

  /* ------------------------------ avisos ------------------------------ */
  L.toast = function (msg, opcoes) {
    opcoes = opcoes || {};
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = L.ic(opcoes.icone || 'check') + '<span>' + msg + '</span>';
    if (opcoes.acao) {
      var a;
      if (opcoes.acao.href) { a = document.createElement('a'); a.href = opcoes.acao.href; a.target = '_blank'; a.rel = 'noopener'; }
      else { a = document.createElement('button'); a.type = 'button'; a.addEventListener('click', function () { opcoes.acao.fn(); t.remove(); }); }
      a.textContent = opcoes.acao.texto;
      t.appendChild(a);
    }
    var box = L.$('#toasts');
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(function () { t.remove(); }, opcoes.tempo || 5200);
  };

  /* ------------------------------ pílulas de situação ------------------------------ */
  L.pilula = function (nivel, texto, icone) {
    return '<span class="pilula ' + nivel + '">' + (icone ? L.ic(icone) : '') + L.esc(texto) + '</span>';
  };
  L.pilulaEstoque = function (p) {
    if (p.estoque == null) return L.pilula('servico', 'Serviço');
    if (p.encomenda) return L.pilula('info', 'Sob encomenda');
    if (p.laboratorio) return L.pilula('info', 'Via laboratório');
    if (p.estoque <= 0) return L.pilula('atrasado', 'Sem estoque');
    var qtd = String(p.estoque).replace('.', ',');
    if (p.estoque < p.minimo) return L.pilula('atencao', qtd + ' · repor', 'alerta');
    return L.pilula('ok', qtd + ' em estoque');
  };
  L.pilulaSegmento = function (seg) {
    return seg === 'otica' ? L.pilula('otica', 'Ótica') : seg === 'joia' ? L.pilula('joia', 'Joalheria') : L.pilula('servico', 'Serviço');
  };

  /* Pendências que vieram do sistema antigo, na ficha do cliente ou do produto. */
  L.secaoImportacao = function (lista) {
    if (!lista || !lista.length) return '';
    return '<div class="secao"><h3>Veio do sistema antigo com</h3><ul class="pendencias">' + lista.map(function (t) { return '<li>' + L.ic('alerta', 'sm') + '<span>' + L.esc(t) + '</span></li>'; }).join('') + '</ul></div>';
  };

  /* ------------------------------ sino (pendências) ------------------------------ */
  L.atualizarSino = function () {
    if (!L.E.usuario) return;
    var n = Atencao.contar(L.atencao());
    var b = L.$('#sino-bolha');
    b.hidden = !n; b.textContent = n;
    var bolhaHoje = L.$('#nav [data-ir="hoje"] .bolha');
    if (bolhaHoje) { bolhaHoje.hidden = !n; bolhaHoje.textContent = n; }
  };

  /* ------------------------------ gemas registradas ------------------------------ */
  L.registrarGema = function (g, local) { g.local = !!local; L.E.gemas.push(g); return g; };
  L.retemaGemas = function () { L.E.gemas.forEach(function (g) { g.retema(); }); };
  L.reagendarGemas = function () { L.E.gemas.forEach(function (g) { g.agendar(); }); };

  /* ------------------------------ copiar / baixar ------------------------------ */
  L.copiar = function (texto, aviso) {
    function falhou() { L.toast('Não deu para copiar automaticamente. Selecione o texto e copie.', { icone: 'alerta' }); }
    try {
      navigator.clipboard.writeText(texto).then(function () { L.toast(aviso || 'Copiado.'); Som.tocar('adicionar'); }, falhou);
    } catch (e) { falhou(); }
  };
  /* Dentro do quadro da prévia publicada, download é bloqueado: lá o CSV vai para a área de transferência. */
  L.baixar = function (nome, conteudo, tipo) {
    if (L.emQuadro) { L.copiar(conteudo, 'CSV copiado. Cole numa planilha.'); return; }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo || 'text/csv;charset=utf-8' }));
    a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    L.toast('Arquivo ' + L.esc(nome) + ' baixado.');
  };
})(typeof self !== 'undefined' ? self : this);
