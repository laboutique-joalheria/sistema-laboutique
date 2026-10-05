/* HOJE: a primeira tela responde três perguntas em segundos —
   onde estou, o que pede atenção e qual é o próximo passo. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic, R$ = L.R$;

  var ICONE_ATENCAO = { pedido: 'relogio', retirada: 'retirada', cobranca: 'moeda', orcamento: 'doc', aniversario: 'presente', receita: 'olho', estoque: 'caixa' };

  /* Mensagens prontas para WhatsApp, com o tom de uma loja de bairro caprichosa. */
  L.mensagem = function (item) {
    var D = L.D, loja = D.loja.nome;
    var c = item.clienteId ? L.cli(item.clienteId) : null;
    var nome = c ? L.primeiroNome(c.nome) : '';
    if (item.tipo === 'retirada') {
      var p = D.pedidos.find(function (x) { return x.id === item.ref; });
      var cp = L.cli(p.clienteId);
      return 'Olá, ' + L.primeiroNome(cp.nome) + '! Aqui é da ' + loja + '. ' + (p.tipo === 'otica' ? 'Seus óculos estão prontos' : 'Seu serviço está pronto') + ' para retirada (pedido ' + p.numero + '). Estamos te esperando! ' + D.loja.horario + '.';
    }
    if (item.tipo === 'cobranca') {
      var f = D.financeiro.find(function (x) { return x.id === item.ref; });
      return 'Olá, ' + nome + '! Tudo bem? Aqui é da ' + loja + '. Passando para lembrar da parcela de ' + R$(f.valorCentavos) + ' com vencimento em ' + Datas.curta(f.vencimento) + '. Se já pagou, desconsidere. Qualquer dúvida, estamos à disposição.';
    }
    if (item.tipo === 'aniversario') return 'Feliz aniversário, ' + nome + '! A equipe da ' + loja + ' deseja um dia lindo. Passe na loja esta semana: separamos um mimo para você.';
    if (item.tipo === 'receita') return 'Olá, ' + nome + '! Aqui é da ' + loja + '. Sua receita de óculos ' + (Datas.diferencaDias(L.hoje, c.receita.validade) < 0 ? 'venceu' : 'está perto de vencer') + '. Quer agendar um novo exame com a nossa optometrista parceira?';
    if (item.tipo === 'orcamento') {
      var q = D.orcamentos.find(function (x) { return x.id === item.ref; });
      return 'Olá, ' + nome + '! Seu orçamento ' + q.numero + ' na ' + loja + ' vale até ' + Datas.curta(q.validade) + '. Posso confirmar para você?';
    }
    return '';
  };

  function clienteDe(item) {
    var c = item.clienteId ? L.cli(item.clienteId) : null;
    if (!c && item.tipo === 'retirada') { var p = L.D.pedidos.find(function (x) { return x.id === item.ref; }); c = p && L.cli(p.clienteId); }
    return c;
  }

  L.acaoAtencao = function (item) {
    if (['retirada', 'cobranca', 'aniversario', 'receita'].indexOf(item.tipo) >= 0) {
      return '<a class="btn sm" href="' + L.wa(L.mensagem(item), clienteDe(item)) + '" target="_blank" rel="noopener" data-wa>' + ic('whats') + esc(item.acao) + '</a>';
    }
    return '<button class="btn sm" data-atencao="' + esc(item.id) + '">' + esc(item.acao) + ic('dir', 'sm') + '</button>';
  };

  L.executarAtencao = function (id) {
    var item = L.atencao().find(function (i) { return i.id === id; });
    if (!item) return;
    if (item.tipo === 'pedido') {
      var p = L.D.pedidos.find(function (x) { return x.id === item.ref; });
      L.E.destaque = p.id;
      L.ir('pedidos', p.tipo);
    } else if (item.tipo === 'orcamento') {
      L.abrirVenda({ orcamentoId: item.ref });
    } else if (item.tipo === 'estoque') {
      L.ir('produtos', item.ref);
    }
  };

  L.listaAtencao = function (itens, limite) {
    if (!itens.length) return '<div class="vazio">' + ic('check', 'lg') + '<h3>Tudo em dia</h3><p>Sem atrasos, retiradas ou cobranças pendentes.</p></div>';
    return '<ul class="atencao-lista">' + itens.slice(0, limite || 99).map(function (it, i) {
      return '<li class="atencao-item ' + it.nivel + '" style="--i:' + i + '"><span class="marcador">' + ic(ICONE_ATENCAO[it.tipo] || 'alerta') + '</span>' +
        '<div style="min-width:0"><strong>' + esc(it.titulo) + '</strong><small>' + esc(it.detalhe) + '</small></div>' + L.acaoAtencao(it) + '</li>';
    }).join('') + '</ul>';
  };

  function graficoSemana() {
    var D = L.D, dias = [];
    for (var i = -6; i <= 0; i++) dias.push(Datas.somarDias(L.hoje, i));
    var porDia = dias.map(function (d) {
      var s = { joia: 0, otica: 0, servico: 0, total: 0 };
      D.vendas.forEach(function (v) {
        if (v.dia !== d) return;
        v.itens.forEach(function (it) { var p = L.prod(it.produtoId); s[p ? p.segmento : 'joia'] += it.precoCentavos * it.qtd; });
        s.total += v.totalCentavos;
      });
      return s;
    });
    var max = Math.max.apply(null, porDia.map(function (s) { return s.joia + s.otica + s.servico; }).concat([1]));
    var W = 420, H = 190, base = 160, topo = 24, larg = 36, passo = (W - 20) / 7;
    var escala = (base - topo) / max;
    var melhorDia = Math.max.apply(null, porDia.map(function (q) { return q.total; }));
    var barras = porDia.map(function (s, i) {
      var x = 10 + i * passo + (passo - larg) / 2, y = base, partes = '';
      [['otica', 'var(--safira)'], ['joia', 'var(--ametista)'], ['servico', 'var(--ouro)']].forEach(function (seg) {
        var h = s[seg[0]] * escala;
        if (h <= 0) return;
        y -= h;
        partes += '<rect class="coluna-barra" style="--i:' + i + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + larg + '" height="' + Math.max(h - 1.5, 1).toFixed(1) + '" rx="3" fill="' + seg[1] + '"/>';
      });
      var ehHoje = i === 6;
      var rot = '<text x="' + (x + larg / 2) + '" y="' + (base + 18) + '" text-anchor="middle" font-size="11" fill="' + (ehHoje ? 'var(--fg)' : 'var(--muted)') + '" font-weight="' + (ehHoje ? 800 : 600) + '">' + (ehHoje ? 'hoje' : Datas.SEMANA[Datas.diaDaSemana(dias[i])]) + '</text>';
      // Rótulo só em hoje e no melhor dia: o resto o olho compara pela altura.
      var val = (ehHoje || s.total === melhorDia) && s.total
        ? '<text x="' + (x + larg / 2) + '" y="' + (y - 7).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="800" fill="var(--fg)">' + esc(R$(s.total).replace(',00', '')) + '</text>' : '';
      return partes + rot + val;
    }).join('');
    var linhas = [0.5, 1].map(function (f) { var y = base - (base - topo) * f; return '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" stroke-dasharray="3 5"/>'; }).join('');
    var semanaTotal = porDia.reduce(function (s, d) { return s + d.total; }, 0);
    return '<section class="painel" data-revelar><div class="painel-topo"><h2>Últimos 7 dias</h2><span class="num" style="font-weight:800">' + R$(semanaTotal) + '</span></div>' +
      '<div class="grafico-semana"><svg viewBox="0 0 ' + W + ' ' + (H + 6) + '" role="img" aria-label="Vendas dos últimos 7 dias, total ' + esc(R$(semanaTotal)) + '">' + linhas +
      '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" stroke="var(--line-strong)"/>' + barras + '</svg>' +
      '<div class="legenda"><span><i style="background:var(--ametista)"></i>Joias</span><span><i style="background:var(--safira)"></i>Ótica</span><span><i style="background:var(--ouro)"></i>Serviços</span></div></div></section>';
  }

  function esteira() {
    var linhas = ['otica', 'joia'].map(function (tipo) {
      var etapas = Pedidos.etapas(tipo).filter(function (e) { return e.id !== 'entregue'; });
      var botoes = etapas.map(function (e) {
        var lista = L.D.pedidos.filter(function (p) { return p.tipo === tipo && p.etapa === e.id; });
        var atraso = lista.some(function (p) { return Pedidos.situacao(p, L.hoje).nivel === 'atrasado'; });
        return '<button class="' + (lista.length ? 'tem ' + tipo : '') + (atraso ? ' atraso' : '') + '" data-ir="pedidos" data-param="' + tipo + '" title="' + esc(e.nome) + ': ' + lista.length + '" aria-label="' + esc(e.nome) + ': ' + lista.length + (atraso ? ', com atraso' : '') + '">' + (lista.length || '') + '</button>';
      }).join('');
      return '<div class="esteira-linha"><span>' + (tipo === 'otica' ? 'Óculos' : 'Joias') + '</span><div class="esteira-trilha">' + botoes + '</div></div>' +
        '<div class="esteira-rotulos"><span></span><div>' + etapas.map(function (e) { return '<small>' + esc(e.nome.replace(' p/ retirar', '')) + '</small>'; }).join('') + '</div></div>';
    }).join('');
    return '<section class="painel"><div class="painel-topo"><h2>Na esteira</h2><button class="btn sm fantasma" data-ir="pedidos">Ver pedidos' + ic('dir', 'sm') + '</button></div><div class="esteira">' + linhas + '</div></section>';
  }

  var COR_AGENDA = { retirada: 'var(--esmeralda)', prova: 'var(--ametista)', consulta: 'var(--safira)', ajuste: 'var(--citrino)', entrega: 'var(--ouro)', retorno: 'var(--safira)', fornecedor: 'var(--muted)' };
  L.COR_AGENDA = COR_AGENDA;

  function agendaHoje() {
    var agora = L.horaAgora();
    var itens = L.D.agenda.filter(function (a) { return a.dia === L.hoje; }).sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; });
    var corpo = itens.length ? '<ul class="linha-tempo">' + itens.map(function (a) {
      var c = a.clienteId ? L.cli(a.clienteId) : null;
      return '<li class="' + (a.fim < agora ? 'passou' : '') + '" style="--cor:' + COR_AGENDA[a.tipo] + '"><time>' + a.inicio + '</time><span class="ponto"></span><div><strong>' + esc(a.titulo) + '</strong><small>' + esc(c ? c.nome : 'Equipe') + '</small></div></li>';
    }).join('') + '</ul>' : '<div class="vazio"><p>Nada marcado para hoje.</p></div>';
    return '<section class="painel"><div class="painel-topo"><h2>Agenda de hoje</h2><button class="btn sm fantasma" data-ir="agenda">Semana' + ic('dir', 'sm') + '</button></div>' + corpo + '</section>';
  }

  L.telas.hoje = {
    titulo: 'Hoje',
    html: function () {
      var D = L.D, u = L.E.usuario, perfil = u.perfil;
      var at = L.atencao();
      var urgentes = Atencao.contar(at);
      var vendasHoje = D.vendas.filter(function (v) { return v.dia === L.hoje; });
      var totalHoje = vendasHoje.reduce(function (s, v) { return s + v.totalCentavos; }, 0);
      var prontos = D.pedidos.filter(function (p) { return p.etapa === 'pronto'; });
      var agHoje = D.agenda.filter(function (a) { return a.dia === L.hoje; }).sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; });
      var agora = L.horaAgora();
      var proximo = agHoje.find(function (a) { return a.inicio >= agora; });
      var abertos = D.financeiro.filter(function (f) { return f.tipo === 'receber' && f.status === 'aberto' && f.vencimento <= L.hoje; });
      var receber = abertos.reduce(function (s, f) { return s + f.valorCentavos; }, 0);
      var vencidas = abertos.filter(function (f) { return f.vencimento < L.hoje; }).length;
      var naEsteira = D.pedidos.filter(function (p) { return p.etapa !== 'entregue'; });
      var atrasados = naEsteira.filter(function (p) { return Pedidos.situacao(p, L.hoje).nivel === 'atrasado'; });

      var resumo = perfil === 'lab'
        ? naEsteira.length + ' pedidos na esteira' + (atrasados.length ? ', <strong>' + atrasados.length + ' atrasado' + (atrasados.length > 1 ? 's' : '') + '</strong>' : '') + '. ' + prontos.length + ' aguardando retirada.'
        : (urgentes ? '<strong>' + urgentes + (urgentes === 1 ? ' coisa pede' : ' coisas pedem') + ' sua atenção agora.</strong> ' : 'Tudo em dia por aqui. ') +
          'Hoje entraram <strong class="num">' + R$(totalHoje) + '</strong> em ' + vendasHoje.length + (vendasHoje.length === 1 ? ' venda.' : ' vendas.');

      var atalhos = (L.podeVender() ? '<button class="btn ouro lg" data-acao="vender">' + ic('vendas') + 'Vender <kbd>F2</kbd></button><button class="btn lg" data-acao="orcamento">' + ic('doc') + 'Orçamento</button>' : '') +
        '<button class="btn lg" data-acao="busca">' + ic('busca') + 'Buscar cliente</button>' +
        '<button class="btn lg" data-acao="retirada">' + ic('retirada') + 'Retirada' + (prontos.length ? ' <span class="pilula pronto">' + prontos.length + '</span>' : '') + '</button>';

      var kpis;
      if (perfil === 'lab') {
        kpis = kpi('safira', 'pedidos', 'Na esteira', naEsteira.length, 'int', 'óculos e serviços', 'pedidos') +
          kpi('ouro', 'alerta', 'Atrasados', atrasados.length, 'int', atrasados.length ? 'resolver primeiro' : 'nenhum atraso', 'pedidos') +
          kpi('verde', 'retirada', 'Prontos para retirar', prontos.length, 'int', 'avisar os clientes', 'pedidos') +
          kpi('ametista', 'agenda', 'Agenda de hoje', agHoje.length, 'int', proximo ? 'próximo às ' + proximo.inicio : 'sem mais horários', 'agenda');
      } else {
        kpis = kpi('ouro', 'vendas', 'Vendido hoje', totalHoje, 'moeda', vendasHoje.length + (vendasHoje.length === 1 ? ' venda' : ' vendas') + (vendasHoje.length ? ' · ticket ' + R$(Math.round(totalHoje / vendasHoje.length)) : ''), 'vendas') +
          (perfil === 'dono'
            ? kpi('safira', 'moeda', 'A receber até hoje', receber, 'moeda', abertos.length + ' parcela' + (abertos.length === 1 ? '' : 's') + (vencidas ? ', ' + vencidas + ' vencida' + (vencidas > 1 ? 's' : '') : ''), 'financeiro')
            : kpi('safira', 'doc', 'Orçamentos abertos', D.orcamentos.filter(function (q) { return q.status === 'aberto'; }).length, 'int', 'retomar com os clientes', 'vendas', 'orcamentos')) +
          kpi('verde', 'retirada', 'Prontos para retirar', prontos.length, 'int', 'óculos e joias', 'pedidos') +
          kpi('ametista', 'agenda', 'Agenda de hoje', agHoje.length, 'int', proximo ? 'próximo às ' + proximo.inicio : 'sem mais horários', 'agenda');
      }

      return faixaDados(perfil) + '<section class="hoje-topo">' +
          '<div><p class="rotulo">' + esc(Datas.porExtenso(L.hoje)) + ' · ' + esc(D.loja.unidade) + '</p>' +
          '<h1>' + L.saudacao() + ', <em>' + esc(u.nome) + '.</em></h1>' +
          '<p class="hoje-resumo">' + resumo + '</p><div class="atalhos">' + atalhos + '</div></div>' +
          '<div class="gema-palco" aria-hidden="true"><canvas id="gema-hoje"></canvas></div>' +
        '</section>' +
        '<div class="kpis">' + kpis + '</div>' +
        '<div class="duas-colunas">' +
          '<section class="painel atencao" id="painel-atencao"><div class="painel-topo"><h2>Atenção agora</h2><span class="muted num">' + at.length + ' itens</span></div>' + L.listaAtencao(at, 8) + '</section>' +
          '<div class="coluna">' + (perfil === 'dono' ? painelMigracao() : '') + (perfil === 'lab' ? '' : graficoSemana()) + esteira() + agendaHoje() + '</div>' +
        '</div>';
    },
    depois: function (v) {
      var c = L.$('#gema-hoje', v);
      if (c) L.registrarGema(new Motion.Gema(c, { escala: 0.34, giro: 0.28 }), true);
    }
  };

  /* Com exemplos, o proprietário vê o convite para trazer os dados reais da loja. */
  function faixaDados(perfil) {
    if (perfil !== 'dono' || L.importado()) return '';
    return '<div class="faixa-dados"><p>' + ic('alerta') + '<span>Você está vendo <strong>exemplos fictícios</strong>. Traga seus clientes e produtos do G-Ótica: leva um minuto e nada sai deste computador.</span></p>' +
      '<button class="btn ouro sm" data-importar-dados>' + ic('baixar') + 'Trazer meus dados</button></div>';
  }

  /* Depois da importação: o que ainda falta acertar, com atalho para a lista certa. */
  function painelMigracao() {
    if (!L.importado()) return '';
    var D = L.D;
    var revisar = D.clientes.filter(function (c) { return (c.tags || []).indexOf('Revisar') >= 0; }).length;
    var porIndice = D.produtos.filter(function (p) { return p.precoPorIndice && !p.precoCentavos; }).length;
    var semPreco = D.produtos.filter(function (p) { return !L.precoDe(p) && p.estoque !== null; }).length;
    var v = D.config.valorIndiceCentavos;
    if (!revisar && !semPreco && !porIndice) return '';
    return '<section class="painel"><div class="painel-topo"><h2>Acertos da migração</h2><button class="btn sm fantasma" data-planilha-pendencias>' + ic('doc') + 'Planilha</button></div><div class="painel-corpo">' +
      '<div class="migracao-numeros">' +
        '<button data-filtrar-clientes="revisar"><strong>' + revisar + '</strong><small>clientes para revisar (telefone, CPF ou duplicado)</small></button>' +
        '<button data-filtrar-produtos="indice"><strong>' + porIndice + '</strong><small>peças com preço pelo índice' + (v ? ' × ' + esc(R$(v)) : ', valor ainda não definido') + '</small></button>' +
        '<button data-filtrar-produtos="sem-preco"><strong>' + semPreco + '</strong><small>peças sem preço para vender</small></button>' +
      '</div>' + (v ? '' : '<p class="muted" style="font-size:var(--fs-sm)">Defina o valor do índice em Ajustes para calcular o preço dessas peças de uma vez.</p>') + '</div></section>';
  }

  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-filtrar-clientes]'))) { L.filtrarClientes(t.dataset.filtrarClientes); return; }
    if ((t = e.target.closest('[data-filtrar-produtos]'))) { L.filtrarProdutos(t.dataset.filtrarProdutos); }
  });

  function kpi(cor, icone, rotulo, valor, formato, nota, ir, param) {
    var texto = formato === 'moeda' ? R$(valor) : String(valor);
    return '<button class="kpi ' + cor + '" data-ir="' + ir + '"' + (param ? ' data-param="' + param + '"' : '') + ' data-inclinar>' +
      '<span class="rotulo">' + ic(icone) + esc(rotulo) + '</span>' +
      '<span class="valor" data-contar="' + valor + '" data-formato="' + formato + '">' + esc(texto) + '</span>' +
      '<span class="nota">' + esc(nota) + '</span></button>';
  }
})(L);
