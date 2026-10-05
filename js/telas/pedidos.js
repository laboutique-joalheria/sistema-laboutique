/* PEDIDOS: esteira própria para óculos (laboratório) e para joias (bancada).
   Cada cartão anda com as setas ‹ › (teclado e toque) ou arrastando com o mouse. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic;

  function tipo() { return L.E.param === 'joia' ? 'joia' : 'otica'; }

  function cartao(p) {
    var c = L.cli(p.clienteId) || { nome: 'Cliente' };
    var s = Pedidos.situacao(p, L.hoje);
    var ant = Pedidos.anterior(p.tipo, p.etapa), prox = Pedidos.proxima(p.tipo, p.etapa);
    return '<article class="cartao' + (L.E.destaque === p.id ? ' destaque' : '') + '" draggable="true" data-pedido="' + p.id + '" data-tipo="' + p.tipo + '" id="cartao-' + p.id + '">' +
      '<div class="linha1"><span class="numero">#' + p.numero + '</span>' + L.pilula(s.nivel, s.texto, s.nivel === 'atrasado' ? 'relogio' : '') + '</div>' +
      '<strong>' + esc(c.nome) + '</strong><p>' + esc(p.descricao) + '</p>' +
      '<div class="progresso" aria-hidden="true"><span style="width:' + Math.round(Pedidos.progresso(p.tipo, p.etapa) * 100) + '%"></span></div>' +
      '<div class="mover">' +
        '<button class="btn icone" data-mover="' + p.id + '" data-dir="-1"' + (ant ? ' aria-label="Voltar para ' + esc(ant.nome) + '"' : ' disabled aria-label="Primeira etapa"') + '>' + ic('esq') + '</button>' +
        '<small class="muted">' + esc(p.parceiro) + '</small>' +
        '<button class="btn icone" data-mover="' + p.id + '" data-dir="1"' + (prox ? ' aria-label="Avançar para ' + esc(prox.nome) + '"' : ' disabled aria-label="Última etapa"') + '>' + ic('dir') + '</button>' +
      '</div></article>';
  }

  L.telas.pedidos = {
    titulo: 'Pedidos',
    html: function () {
      var t = tipo();
      var contagem = function (x) { return L.D.pedidos.filter(function (p) { return p.tipo === x && p.etapa !== 'entregue'; }).length; };
      var colunas = Pedidos.etapas(t).map(function (e, i) {
        var lista = L.D.pedidos.filter(function (p) { return p.tipo === t && p.etapa === e.id; });
        if (e.id === 'entregue') lista = lista.filter(function (p) { return Datas.diferencaDias(p.prazo, L.hoje) <= 15; });
        lista.sort(function (a, b) { return a.prazo < b.prazo ? -1 : 1; });
        return '<section class="coluna-k" data-etapa="' + e.id + '" style="--i:' + i + '" aria-label="' + esc(e.nome) + '"><header><h3>' + esc(e.nome) + '</h3><span class="cont">' + lista.length + '</span></header>' +
          (lista.map(cartao).join('') || '<p class="muted" style="font-size:var(--fs-sm);padding:8px 4px">Vazio</p>') + '</section>';
      }).join('');
      return '<div class="cabeca"><div><h1>Pedidos e serviços</h1><p>' + (t === 'otica' ? 'Óculos do recebimento ao laboratório, montagem, conferência e entrega.' : 'Joias da avaliação à bancada e à entrega. Encomendas e reparos no mesmo lugar.') + '</p></div>' +
        '<div class="cabeca-acoes"><button class="btn" data-acao="retirada">' + ic('retirada') + 'Registrar retirada</button></div></div>' +
        '<div class="abas" role="tablist" style="margin-bottom:20px;max-width:max-content"><button class="aba" role="tab" data-tipo-pedido="otica" aria-selected="' + (t === 'otica') + '">Óculos de grau<span class="cont">' + contagem('otica') + '</span></button><button class="aba" role="tab" data-tipo-pedido="joia" aria-selected="' + (t === 'joia') + '">Joalheria<span class="cont">' + contagem('joia') + '</span></button></div>' +
        '<div class="kanban" id="kanban">' + colunas + '</div>' +
        '<p class="muted" style="font-size:var(--fs-sm);margin-top:8px">' + ic('teclado', 'sm') + ' Use as setas ‹ › do cartão ou arraste com o mouse.</p>';
    },
    depois: function (v) {
      if (L.E.destaque) {
        var el = L.$('#cartao-' + L.E.destaque, v);
        if (el) { setTimeout(function () { el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: Motion.ativo() ? 'smooth' : 'auto' }); el.animate && Motion.ativo() && el.animate([{ boxShadow: '0 0 0 3px var(--ouro)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 1600, iterations: 2 }); }, 350); }
        L.E.destaque = null;
      }
      arrastar(v);
    }
  };

  L.moverPedido = function (id, novaEtapa, direcao) {
    var p = L.D.pedidos.find(function (x) { return x.id === id; });
    if (!p || p.etapa === novaEtapa) return;
    var antes = L.$('#cartao-' + id);
    var ret = antes ? antes.getBoundingClientRect() : null;
    p.etapa = novaEtapa;
    L.salvar();
    L.atualizar();
    var depois = L.$('#cartao-' + id);
    Motion.flip(depois, ret);
    if (depois) depois.querySelector('[data-mover][data-dir="' + (direcao || 1) + '"]:not([disabled])') && depois.querySelector('[data-mover][data-dir="' + (direcao || 1) + '"]').focus({ preventScroll: true });
    var c = L.cli(p.clienteId);
    if (novaEtapa === 'pronto') {
      Som.tocar('adicionar');
      L.toast('Pedido ' + p.numero + ' pronto. Avise ' + esc(L.primeiroNome(c.nome)) + '.', { icone: 'retirada', acao: { texto: 'WhatsApp', href: L.wa(L.mensagem({ tipo: 'retirada', ref: p.id }), c) } });
    } else if (novaEtapa === 'entregue') {
      Som.tocar('sucesso');
      L.toast('Pedido ' + p.numero + ' entregue a ' + esc(c.nome) + '.', { acao: { texto: 'Desfazer', fn: function () { L.moverPedido(id, 'pronto', -1); } } });
    } else {
      Som.tocar(direcao < 0 ? 'setaVolta' : 'seta');
    }
  };

  function arrastar(v) {
    var colunas = L.$$('.coluna-k', v), arrastado = null;
    L.$$('.cartao', v).forEach(function (c) {
      c.addEventListener('dragstart', function (e) { arrastado = c.dataset.pedido; c.classList.add('arrastando'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', arrastado); });
      c.addEventListener('dragend', function () { c.classList.remove('arrastando'); colunas.forEach(function (k) { k.classList.remove('alvo'); }); });
    });
    colunas.forEach(function (k) {
      k.addEventListener('dragover', function (e) { e.preventDefault(); k.classList.add('alvo'); });
      k.addEventListener('dragleave', function () { k.classList.remove('alvo'); });
      k.addEventListener('drop', function (e) {
        e.preventDefault(); k.classList.remove('alvo');
        var id = e.dataTransfer.getData('text/plain') || arrastado;
        var p = L.D.pedidos.find(function (x) { return x.id === id; });
        if (!p) return;
        var dir = Pedidos.indice(p.tipo, k.dataset.etapa) >= Pedidos.indice(p.tipo, p.etapa) ? 1 : -1;
        L.moverPedido(id, k.dataset.etapa, dir);
      });
    });
  }

  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-tipo-pedido]'))) { L.ir('pedidos', t.dataset.tipoPedido, { som: false }); Som.tocar('clique'); return; }
    if ((t = e.target.closest('[data-mover]'))) {
      var p = L.D.pedidos.find(function (x) { return x.id === t.dataset.mover; });
      var d = Number(t.dataset.dir);
      var alvo = d > 0 ? Pedidos.proxima(p.tipo, p.etapa) : Pedidos.anterior(p.tipo, p.etapa);
      if (alvo) L.moverPedido(p.id, alvo.id, d);
    }
  });

  /* Retirada: lista o que está pronto, de óculos e de joias, e entrega com um toque. */
  L.registrarRetirada = function () {
    function corpo() {
      var prontos = L.D.pedidos.filter(function (p) { return p.etapa === 'pronto'; });
      if (!prontos.length) return '<div class="vazio">' + ic('check', 'lg') + '<h3>Nada aguardando retirada</h3></div>';
      return prontos.map(function (p) {
        var c = L.cli(p.clienteId);
        return '<div class="atencao-item hoje" style="grid-template-columns:40px minmax(0,1fr) auto">' + L.avatar(c) + '<div style="min-width:0"><strong>' + esc(c.nome) + '</strong><small>#' + p.numero + ' · ' + esc(p.descricao) + '</small></div><button class="btn sm ouro" data-entregar="' + p.id + '">' + ic('check', 'sm') + 'Entregar</button></div>';
      }).join('');
    }
    var m = L.modal({ titulo: 'Registrar retirada', corpo: '<div id="retirada-lista" style="display:grid;gap:4px">' + corpo() + '</div>' });
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-entregar]');
      if (!b) return;
      var p = L.D.pedidos.find(function (x) { return x.id === b.dataset.entregar; });
      p.etapa = 'entregue'; L.salvar();
      Som.tocar('sucesso');
      L.toast('Pedido ' + p.numero + ' entregue a ' + esc(L.cli(p.clienteId).nome) + '.');
      L.$('#retirada-lista', m).innerHTML = corpo();
      if (['hoje', 'pedidos'].indexOf(L.E.rota) >= 0) L.atualizar();
    });
  };
})(L);
