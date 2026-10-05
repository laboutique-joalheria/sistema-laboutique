/* AJUSTES: aparência, sons, efeitos, perfis de acesso e dados da demonstração.
   Fica fora do caminho da operação diária, mas sem esconder o que importa. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic;
  var NOMES_TELAS = { hoje: 'Hoje', clientes: 'Clientes', vendas: 'Vendas', pedidos: 'Pedidos', produtos: 'Produtos', financeiro: 'Financeiro', agenda: 'Agenda', relatorios: 'Relatórios', ajustes: 'Ajustes' };

  L.telas.ajustes = {
    titulo: 'Ajustes',
    html: function () {
      var tema = document.documentElement.getAttribute('data-theme') || 'sistema';
      var efeitos = Motion.ativo();
      var D = L.D, dono = L.E.usuario.perfil === 'dono';
      return '<div class="cabeca"><div><h1>Ajustes</h1><p>Preferências deste aparelho, acessos da equipe e dados da loja.</p></div></div>' +
        '<div class="duas-colunas">' +
        '<div class="coluna">' +
          '<section class="painel"><div class="painel-topo"><h2>Aparência e sons</h2></div><div class="painel-corpo" style="display:grid;gap:20px">' +
            '<div class="campo"><span>Tema</span><span class="seg" role="group" aria-label="Tema">' + [['sistema', 'Do aparelho'], ['light', 'Claro'], ['dark', 'Escuro']].map(function (t) { return '<button data-tema="' + t[0] + '" aria-pressed="' + (tema === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</span></div>' +
            '<div class="campo"><span>Sons ao clicar, navegar e concluir</span><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="seg"><button data-som-pref="1" aria-pressed="' + Som.ligado + '">Ligados</button><button data-som-pref="0" aria-pressed="' + !Som.ligado + '">Desligados</button></span>' +
              '<label style="display:flex;gap:8px;align-items:center;font-size:var(--fs-sm)">' + ic('som', 'sm') + '<input type="range" id="volume" min="0.05" max="1" step="0.05" value="' + Som.volume + '" aria-label="Volume" style="accent-color:var(--ouro)"></label></div><small>Na loja, com cliente no balcão, a recomendação é deixar desligado.</small></div>' +
            '<div class="campo"><span>Efeitos de movimento</span><span class="seg"><button data-efeitos-pref="1" aria-pressed="' + efeitos + '">Ligados</button><button data-efeitos-pref="0" aria-pressed="' + !efeitos + '">Pausados</button></span><small>Pausar deixa tudo parado e mais leve. Se o aparelho pede menos movimento, já começa pausado.</small></div>' +
          '</div></section>' +
          '<section class="painel"><div class="painel-topo"><h2>Atalhos de teclado</h2></div><div class="painel-corpo"><dl class="atributos">' +
            '<dt><kbd>F2</kbd></dt><dd>Nova venda, de qualquer tela</dd><dt><kbd>Ctrl K</kbd> ou <kbd>/</kbd></dt><dd>Buscar cliente, produto, pedido ou ação</dd><dt><kbd>Ctrl ↵</kbd></dt><dd>Avançar ou concluir a venda</dd><dt><kbd>← →</kbd></dt><dd>Trocar a semana na agenda</dd><dt><kbd>Esc</kbd></dt><dd>Fechar a janela aberta</dd></dl></div></section>' +
        '</div><div class="coluna">' +
          '<section class="painel"><div class="painel-topo"><h2>Equipe e acesso</h2></div><div class="painel-corpo" style="display:grid;gap:14px">' +
            '<p class="aviso-demo">' + ic('alerta', 'sm') + '<span>Pessoa nova entra com o perfil Vendas. Acesso de proprietário só por escolha explícita.</span></p>' +
            D.equipe.map(function (u) { var p = D.perfis[u.perfil]; return '<div class="usuario" style="padding:0;grid-template-columns:40px 1fr">' + L.avatar(u) + '<div><strong>' + esc(u.nome + ' ' + u.sobrenome) + '</strong><small>' + esc(p.nome) + ' · vê: ' + p.telas.filter(function (t) { return t !== 'ajustes'; }).map(function (t) { return NOMES_TELAS[t]; }).join(', ') + '</small></div></div>'; }).join('') +
            (dono ? '' : '<p class="muted" style="font-size:var(--fs-sm)">Só o proprietário altera perfis.</p>') +
          '</div></section>' +
          '<section class="painel"><div class="painel-topo"><h2>Loja</h2></div><div class="painel-corpo"><dl class="atributos"><dt>Nome</dt><dd>' + esc(D.loja.nome) + '</dd><dt>Segmento</dt><dd>' + esc(D.loja.segmento) + '</dd><dt>Unidade</dt><dd>' + esc(D.loja.unidade) + '</dd><dt>Cidade</dt><dd>' + esc(D.loja.cidade) + '</dd><dt>Horário</dt><dd>' + esc(D.loja.horario) + '</dd></dl></div></section>' +
          painelDados(D, dono) +
        '</div></div>';
    },
    depois: function (v) {
      var vol = L.$('#volume', v);
      vol.addEventListener('input', function () { Som.definirVolume(Number(vol.value)); });
      vol.addEventListener('change', function () { Som.tocar('adicionar'); });
    }
  };

  /* Dados: exemplos fictícios ou cadastros trazidos do G-Ótica. */
  function painelDados(D, dono) {
    var imp = L.importado() && D.importacao;
    var texto = imp
      ? 'Cadastros trazidos do G-Ótica em ' + esc(Datas.curta(imp.quando)) + '/' + esc(String(imp.quando).slice(0, 4)) + ': <strong>' + D.clientes.length + ' clientes</strong> e <strong>' + D.produtos.length + ' produtos</strong>. Ficam só neste navegador.'
      : 'Os exemplos são fictícios e ficam só neste navegador. Vendas feitas aqui mudam estoque, pedidos e financeiro de verdade dentro da demonstração.';
    var temIndice = D.produtos.some(function (p) { return p.precoPorIndice; });
    var v = D.config.valorIndiceCentavos;
    var indice = dono && temIndice
      ? '<form class="campo" id="form-indice" style="margin-top:4px"><span>Valor do índice (R$)</span><span style="display:flex;gap:8px;flex-wrap:wrap"><input class="entrada num" id="valor-indice" inputmode="decimal" placeholder="ex.: 100,00" value="' + (v ? esc(Dinheiro.formatar(v).replace(/^R\$\s?/, '')) : '') + '" style="max-width:180px"><button class="btn" type="submit">' + ic('check') + 'Salvar</button></span>' +
        '<small>Preço = índice × este valor, para as peças que vieram com preço 0. Hipótese a confirmar com a loja; quem tem preço próprio não muda.</small></form>' : '';
    return '<section class="painel"><div class="painel-topo"><h2>' + (imp ? 'Dados da loja' : 'Demonstração') + '</h2>' + (imp ? L.pilula('ok', 'Importados', 'check') : L.pilula('info', 'Exemplos')) + '</div><div class="painel-corpo" style="display:grid;gap:12px"><p class="muted">' + texto + '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        (dono ? '<button class="btn ' + (imp ? '' : 'ouro') + '" data-importar-dados>' + ic('baixar') + (imp ? 'Importar de novo' : 'Trazer dados do G-Ótica') + '</button>' : '') +
        (imp && dono ? '<button class="btn" data-planilha-pendencias>' + ic('doc') + 'Planilha de pendências</button>' : '') +
        '<button class="btn" data-refazer-tour>' + ic('efeitos') + 'Refazer o tour</button>' +
        (dono || !imp ? '<button class="btn perigo" data-restaurar>' + ic('restaurar') + (imp ? 'Voltar aos exemplos' : 'Restaurar exemplos') + '</button>' : '') + '</div>' + indice + '</div></section>';
  }

  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'form-indice') return;
    e.preventDefault();
    var campo = L.$('#valor-indice'), v = Dinheiro.lerReais(campo.value);
    if (campo.value.trim() && !(v > 0)) { Som.tocar('erro'); L.toast('Informe um valor como 100,00.', { icone: 'alerta' }); return; }
    L.D.config.valorIndiceCentavos = v > 0 ? v : null;
    L.salvar(); Som.tocar('sucesso');
    var n = L.D.produtos.filter(function (p) { return p.precoPorIndice && !p.precoCentavos; }).length;
    L.toast(v > 0 ? 'Valor do índice: ' + L.R$(v) + '. ' + n + ' peças com preço calculado.' : 'Valor do índice removido.');
    L.atualizar();
  });

  document.addEventListener('click', function (e) {
    var t;
    if (e.target.closest('[data-importar-dados]')) { L.abrirImportacao(); return; }
    if (e.target.closest('[data-planilha-pendencias]')) { L.planilhaPendencias(); return; }
    if ((t = e.target.closest('[data-tema]'))) { L.definirTema(t.dataset.tema); L.atualizar(); return; }
    if ((t = e.target.closest('[data-som-pref]'))) { L.definirSom(t.dataset.somPref === '1'); L.atualizar(); return; }
    if ((t = e.target.closest('[data-efeitos-pref]'))) { L.definirEfeitos(t.dataset.efeitosPref === '1'); L.atualizar(); return; }
    if (e.target.closest('[data-refazer-tour]')) { L.ir('hoje'); setTimeout(L.tour, 500); return; }
    if (e.target.closest('[data-restaurar]')) {
      var imp = L.importado();
      L.confirmar({ titulo: imp ? 'Voltar aos exemplos?' : 'Restaurar os exemplos?', texto: imp ? 'Os clientes e produtos importados do G-Ótica serão apagados deste navegador. Para tê-los de volta, é só importar os PDFs de novo.' : 'Vendas, clientes e pedidos criados nesta demonstração serão apagados deste navegador.', ok: imp ? 'Apagar e voltar aos exemplos' : 'Restaurar', perigo: true })
        .then(function (sim) { if (!sim) return; L.restaurar(); L.atualizarSino(); L.ir('hoje'); L.toast('Exemplos restaurados.', { icone: 'restaurar' }); });
    }
  });
})(L);
