/* IMPORTAR: traz os clientes e os produtos dos relatórios em PDF do G-Ótica.
   Tudo acontece neste navegador: o PDF é lido aqui mesmo (pdf.js) e nada vai para servidor.
   Antes de gravar, a tela mostra a conferência com os totais impressos no relatório e
   os problemas encontrados, para a loja decidir com os olhos abertos. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic, R$ = L.R$;
  var PDFJS = 'js/vendor/pdfjs/pdf.min.js', WORKER = 'js/vendor/pdfjs/pdf.worker.min.js';
  var S = null, folha = null, camada = null, carregando = null;

  /* Nome e efeito de cada problema, em português de balcão. */
  var PROBLEMAS = {
    'sem-nome': ['Sem nome', 'importa como “Cliente nº”'],
    'telefone-invalido': ['Telefone incompleto ou inválido', 'fica guardado, mas sem WhatsApp'],
    'sem-telefone': ['Sem telefone', 'importa assim'],
    'sem-ddd': ['Telefone sem DDD', 'DDD 55 incluído'],
    'celular-8-digitos': ['Celular antigo com 8 dígitos', 'o 9 foi incluído'],
    'sem-documento': ['Sem CPF/CNPJ', 'importa assim'],
    'documento-invalido': ['CPF/CNPJ com dígito errado', 'importa e marca para revisar'],
    'sem-nascimento': ['Sem data de nascimento', 'fica sem aviso de aniversário'],
    'nascimento-invalido': ['Data de nascimento impossível', 'fica em branco'],
    'sem-endereco': ['Sem endereço', 'importa assim'],
    'endereco-incompleto': ['Endereço incompleto', 'importa assim'],
    'cidade-incompleta': ['Cidade cortada no relatório', 'importa como está'],
    'campos-separados': ['Campos grudados no PDF', 'separados automaticamente'],
    duplicado: ['Possível duplicado', 'importa os dois e marca para revisar'],
    'leitura-ambigua': ['Leitura ambígua', 'conferir na ficha'],
    'sem-descricao': ['Sem descrição', 'conferir na ficha'],
    'sem-codigo': ['Sem código', 'conferir na ficha'],
    'preco-por-indice': ['Preço 0 com índice preenchido', 'preço = índice × valor do índice'],
    'sem-preco': ['Sem preço e sem índice', 'pergunta o preço na venda'],
    'sem-custo': ['Sem custo', 'margem fica em branco'],
    'sem-estoque': ['Sem estoque', 'importa com zero'],
    'qtd-fracionada': ['Quantidade fracionada', 'importa como está'],
    'peso-divergente': ['Peso da descrição diferente do campo PESO', 'vale o campo PESO'],
    'nao-produto': ['Linha que não parece produto', 'conferir e excluir se for o caso'],
    'categoria-deduzida': ['Categoria deduzida pelo grupo', 'conferir na ficha'],
    'sem-categoria': ['Sem categoria reconhecida', 'vai para “Outros”']
  };
  var NUM = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
  var NOME_TOTAL = { itens: 'Itens', quantidade: 'Quantidade em estoque', valorEstoque: 'Valor do estoque (custo)', valorVenda: 'Valor de venda', indice: 'Índice total', peso: 'Peso total (g)' };

  /* ------------------------------ leitura do PDF ------------------------------ */
  function carregarScript(src) {
    return new Promise(function (ok, falha) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { falha(new Error('Não deu para carregar ' + src)); };
      document.head.appendChild(s);
    });
  }
  function carregarPdfjs() {
    if (carregando) return carregando;
    carregando = carregarScript(PDFJS).then(function () {
      var pdfjs = window.pdfjsLib;
      if (!pdfjs) throw new Error('O leitor de PDF não iniciou.');
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER;
      // Em página isolada (prévia publicada), o navegador recusa o worker em segundo plano.
      // Com o leitor carregado na própria página, o pdf.js trabalha sem worker.
      var isolada = false;
      try { isolada = window.origin === 'null' || window.self !== window.top; } catch (e) { isolada = true; }
      return isolada ? carregarScript(WORKER).then(function () { return pdfjs; }) : pdfjs;
    });
    carregando.catch(function () { carregando = null; });
    return carregando;
  }
  function um(n) { return Math.round(n * 10) / 10; }
  /* Mesmo formato usado para validar o importador: { p, x, y a partir do topo, w, s }.
     ativo(): falso quando a pessoa fechou a tela; a leitura para e o pdf.js libera a memória. */
  var CANCELADO = 'leitura-cancelada';
  function extrair(buffer, aoAvancar, ativo) {
    var tarefa = null;
    return carregarPdfjs().then(function (pdfjs) {
      tarefa = pdfjs.getDocument({ data: new Uint8Array(buffer), disableFontFace: true, isEvalSupported: false });
      return tarefa.promise;
    }).then(function (doc) {
      var itens = [], p = 0;
      function proxima() {
        p++;
        if (!ativo()) throw new Error(CANCELADO);
        if (p > doc.numPages) { tarefa.destroy(); return itens; }
        return doc.getPage(p).then(function (pg) {
          var vp = pg.getViewport({ scale: 1 });
          return pg.getTextContent().then(function (tc) {
            tc.items.forEach(function (it) {
              if (!it.str || !it.str.trim()) return;
              itens.push({ p: p, x: um(it.transform[4]), y: um(vp.height - it.transform[5]), w: um(it.width), s: it.str });
            });
            pg.cleanup();
            aoAvancar(p, doc.numPages);
            return proxima();
          });
        });
      }
      return proxima();
    }).catch(function (e) {
      if (tarefa) tarefa.destroy();
      throw e;
    });
  }

  /* Erro do pdf.js em português de balcão; o detalhe técnico vai só para o console. */
  function motivo(e) {
    var nome = e && e.name;
    if (nome === 'PasswordException') return 'O PDF está protegido por senha. Exporte de novo no G-Ótica sem senha.';
    if (nome === 'InvalidPDFException' || nome === 'MissingPDFException') return 'O arquivo está danificado ou incompleto. Exporte o relatório de novo.';
    if (window.console) console.warn('Importação: falha ao ler o PDF', e);
    return 'Não deu para ler este arquivo. Exporte o relatório de novo em PDF.';
  }

  function lerArquivo(arquivo) {
    var sessao = S, cartao = { nome: arquivo.name, estado: 'lendo', pagina: 0, paginas: 0 };
    var ativo = function () { return S === sessao && !S.feito; };
    S.lendo.push(cartao);
    desenhar();
    if (!/\.pdf$/i.test(arquivo.name) && arquivo.type !== 'application/pdf') return falhar(cartao, 'Não é PDF. Exporte o relatório do G-Ótica em PDF.');
    if (!arquivo.size) return falhar(cartao, 'O arquivo está vazio. Exporte o relatório de novo.');
    arquivo.arrayBuffer().then(function (buf) {
      return extrair(buf, function (p, n) { cartao.pagina = p; cartao.paginas = n; atualizarProgresso(cartao); }, ativo);
    }).then(function (itens) {
      if (!ativo()) return;
      var tipo = Importacao.detectar(itens);
      if (!tipo) return falhar(cartao, 'Não parece um relatório do G-Ótica. Use “Cadastro de Clientes” ou “Posição do Estoque”.');
      var res = Importacao.ler(itens, { anoAtual: Number(L.hoje.slice(0, 4)), ddd: '55' });
      S.lendo = S.lendo.filter(function (c) { return c !== cartao; });
      // Sem custo é ausência do campo no relatório inteiro, não defeito de cada peça: não pinta a barra.
      S[tipo] = { arquivo: arquivo.name, paginas: cartao.paginas, res: res, resumo: Importacao.resumir(res, { ignorar: { 'sem-custo': 1 } }) };
      Som.tocar('sucesso');
      desenhar();
    }).catch(function (e) {
      if (!ativo() || (e && e.message === CANCELADO)) return; // a tela foi fechada: sai em silêncio
      falhar(cartao, motivo(e));
    });
  }
  function falhar(cartao, msg) {
    if (!S) return;
    cartao.estado = 'erro'; cartao.erro = msg;
    Som.tocar('erro');
    desenhar();
  }
  function atualizarProgresso(cartao) {
    if (!S) return;
    var i = S.lendo.indexOf(cartao);
    var el = folha && L.$('[data-lendo="' + i + '"]', folha);
    if (!el) return;
    L.$('.progresso i', el).style.width = Math.round(cartao.pagina / cartao.paginas * 100) + '%';
    L.$('small', el).textContent = 'Página ' + cartao.pagina + ' de ' + cartao.paginas;
  }

  /* ------------------------------ folha ------------------------------ */
  L.abrirImportacao = function () {
    if (folha) return;
    if (L.E.usuario.perfil !== 'dono') { L.toast('Só o proprietário traz dados do sistema antigo.', { icone: 'alerta' }); return; }
    // Importar troca a base inteira: nada pode ficar aberto por baixo apontando para a base antiga.
    if (L.E.camadas.some(function (c) { return c.antesDeFechar; })) { L.toast('Conclua ou feche a venda aberta antes de importar.', { icone: 'alerta' }); Som.tocar('erro'); return; }
    L.fecharTudo();
    S = { lendo: [], clientes: null, produtos: null, feito: null, valorIndice: L.D.config.valorIndiceCentavos ? Dinheiro.formatar(L.D.config.valorIndiceCentavos).replace(/^R\$\s?/, '') : '' };
    folha = document.createElement('div');
    folha.className = 'folha importar';
    folha.setAttribute('role', 'dialog'); folha.setAttribute('aria-modal', 'true'); folha.setAttribute('aria-labelledby', 'imp-titulo');
    folha.innerHTML = '<header class="folha-topo"><h2 id="imp-titulo">Trazer dados do G-Ótica</h2><button class="btn icone" id="imp-fechar" aria-label="Fechar">' + ic('fechar') + '</button></header>' +
      '<div class="folha-corpo so-etapa"><section class="folha-etapa" id="imp-etapa" aria-live="polite"></section></div>';
    camada = L.abrirCamada(folha, { veu: false, antesDeFechar: pedirParaFechar, aoFechar: function () {
      var feito = S && S.feito;
      folha = null; S = null;
      if (feito) L.atualizar(); // a tela de trás ainda mostrava os exemplos
    } });
    L.$('#imp-fechar', folha).addEventListener('click', function () { L.fecharCamada(camada); });
    folha.addEventListener('click', aoClicar);
    folha.addEventListener('change', aoMudar);
    folha.addEventListener('input', aoDigitar);
    // Arquivo solto em qualquer ponto da folha conta: sem isso o navegador abriria o PDF no lugar do app.
    var temArquivo = function (e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; };
    ['dragenter', 'dragover'].forEach(function (t) { folha.addEventListener(t, function (e) { if (!temArquivo(e)) return; e.preventDefault(); var z = L.$('.soltar', folha); if (z) z.classList.add('sobre'); }); });
    folha.addEventListener('dragleave', function (e) { if (e.target === folha || !folha.contains(e.relatedTarget)) { var z = L.$('.soltar', folha); if (z) z.classList.remove('sobre'); } });
    folha.addEventListener('drop', function (e) {
      if (!temArquivo(e)) return;
      e.preventDefault();
      var z = L.$('.soltar', folha); if (z) z.classList.remove('sobre');
      if (S && !S.feito) Array.prototype.forEach.call(e.dataTransfer.files || [], lerArquivo);
    });
    desenhar();
    Som.tocar('abrir');
    carregarPdfjs().catch(function () { /* o erro aparece quando a pessoa escolher o arquivo */ });
  };

  function pedirParaFechar() {
    if (!S || S.feito || (!S.clientes && !S.produtos)) return true;
    L.confirmar({ titulo: 'Sair sem importar?', texto: 'Os relatórios lidos aqui serão descartados. Nada foi gravado ainda.', ok: 'Sair sem importar', cancelar: 'Continuar', perigo: true })
      .then(function (sim) { if (sim) L.fecharCamada(camada, true); });
    return false;
  }

  function desenhar() {
    if (!folha) return;
    var el = L.$('#imp-etapa', folha);
    el.innerHTML = S.feito ? telaFeito() : telaPrevia();
    L.$$('#imp-etapa > *', folha).forEach(function (x, i) { x.style.setProperty('--i', i); });
    if (S.feito) { var c = L.$('#imp-sucesso', el); if (c) L.registrarGema(Motion.sucesso(c), true); }
  }

  /* ---------- escolher e conferir ---------- */
  function telaPrevia() {
    var tem = S.clientes || S.produtos;
    return '<div class="imp-intro"><p class="rotulo">Migração · passo único</p><h3>Seus clientes e produtos, sem redigitar.</h3>' +
      '<p class="muted">No G-Ótica, exporte em PDF o <strong>Cadastro de Clientes</strong> e a <strong>Posição do Estoque</strong>. Solte os dois aqui. O Lapidar lê, confere com os totais do próprio relatório e mostra o que precisa de atenção antes de gravar.</p></div>' +
      '<label class="soltar' + (tem ? ' compacta' : '') + '" tabindex="-1">' + ic('baixar', 'lg') + '<strong>' + (tem ? 'Trocar ou incluir um relatório' : 'Solte os PDFs aqui ou clique para escolher') + '</strong><small>Pode mandar os dois de uma vez. O arquivo é lido neste navegador e não sai do computador.</small>' +
        '<input type="file" id="imp-arquivo" accept="application/pdf,.pdf" multiple class="sr"></label>' +
      '<div class="imp-cartoes">' + cartao('clientes') + cartao('produtos') + S.lendo.map(cartaoLendo).join('') + '</div>' +
      (S.clientes ? previaClientes() : '') + (S.produtos ? previaProdutos() : '') +
      (tem ? '<div class="imp-acao"><p>' + resumoAcao() + '</p><button class="btn ouro lg" data-importar' + (lendo() ? ' disabled' : '') + '>' + ic('check') + (lendo() ? 'Aguarde a leitura…' : 'Importar para o Lapidar') + '</button></div>' : '');
  }
  // Enquanto um PDF ainda está sendo lido, não dá para importar: a pessoa confirmaria sem ver a prévia dele.
  function lendo() { return S.lendo.some(function (c) { return c.estado === 'lendo'; }); }
  function resumoAcao() {
    var partes = [];
    if (S.clientes) partes.push('<strong>' + S.clientes.res.registros.length + '</strong> clientes');
    if (S.produtos) partes.push('<strong>' + S.produtos.res.registros.length + '</strong> produtos');
    if (L.importado()) return 'Vão ser atualizados ' + partes.join(' e ') + ', pelo código do G-Ótica. Vendas, pedidos, parcelas e cadastros feitos no Lapidar continuam.';
    var faltando = !S.clientes ? ' Os clientes de exemplo continuam até você trazer o relatório de clientes.' : !S.produtos ? ' Os produtos de exemplo continuam até você trazer o relatório de estoque.' : '';
    return 'Vão entrar ' + partes.join(' e ') + '. Vendas, pedidos e agenda de exemplo saem; equipe e preferências ficam.' + faltando;
  }
  function cartao(tipo) {
    var x = S[tipo], nome = tipo === 'clientes' ? 'Cadastro de clientes' : 'Posição do estoque';
    if (!x) return '<div class="imp-cartao vazio-c">' + ic(tipo === 'clientes' ? 'clientes' : 'produtos') + '<div><strong>' + nome + '</strong><small>Aguardando o PDF</small></div></div>';
    var conf = conferenciaOk(tipo);
    return '<div class="imp-cartao ' + (conf ? 'ok' : 'alerta') + '">' + ic(conf ? 'check' : 'alerta') + '<div><strong>' + nome + '</strong><small>' + esc(x.arquivo) + ' · ' + x.paginas + ' páginas · ' + x.res.registros.length + ' registros</small></div>' +
      '<button class="btn sm fantasma" data-trocar="' + tipo + '" aria-label="Remover ' + nome + '">' + ic('lixo', 'sm') + '</button></div>';
  }
  function cartaoLendo(c, i) {
    if (c.estado === 'erro') return '<div class="imp-cartao erro">' + ic('alerta') + '<div><strong>' + esc(c.nome) + '</strong><small>' + esc(c.erro) + '</small></div><button class="btn sm fantasma" data-descartar="' + i + '" aria-label="Descartar">' + ic('fechar', 'sm') + '</button></div>';
    var pct = c.paginas ? Math.round(c.pagina / c.paginas * 100) : 0;
    return '<div class="imp-cartao lendo" data-lendo="' + i + '">' + ic('doc') + '<div><strong>Lendo ' + esc(c.nome) + '</strong><small>' + (c.paginas ? 'Página ' + c.pagina + ' de ' + c.paginas : 'Abrindo o arquivo…') + '</small><span class="progresso"><i style="width:' + pct + '%"></i></span></div></div>';
  }

  function conferenciaOk(tipo) {
    var c = S[tipo].res.conferencia;
    if (tipo === 'clientes') return c.confere === true;
    return Object.keys(c.confere).every(function (k) { return c.confere[k] !== false; }) && Object.keys(c.confere).some(function (k) { return c.confere[k] === true; });
  }

  function saude(r) {
    var t = r.total || 1;
    var seg = function (n, cls) { return n ? '<i class="' + cls + '" style="flex:' + n + '"></i>' : ''; };
    return '<div class="saude"><div class="saude-barra" role="img" aria-label="' + r.limpos + ' sem pendência, ' + r.comAviso + ' com aviso, ' + r.comErro + ' com erro">' + seg(r.limpos, 'ok') + seg(r.comAviso, 'aviso') + seg(r.comErro, 'erro') + '</div>' +
      '<div class="legenda"><span><i class="ok"></i>' + r.limpos + ' sem pendência (' + Math.round(r.limpos / t * 100) + '%)</span><span><i class="aviso"></i>' + r.comAviso + ' com aviso</span><span><i class="erro"></i>' + r.comErro + ' com erro</span></div></div>';
  }

  function listaProblemas(r) {
    if (!r.problemas.length) return '<p class="status-pagamento ok" style="margin:0">' + ic('check') + 'Nenhum problema encontrado.</p>';
    return '<div class="problemas">' + r.problemas.map(function (p) {
      var nome = PROBLEMAS[p.chave] || [p.chave, ''];
      return '<details class="problema ' + (p.grave ? 'grave' : '') + '"><summary><span class="qtd-prob num">' + p.quantos + '</span><span class="t"><strong>' + esc(nome[0]) + '</strong><small>' + esc(nome[1]) + '</small></span>' + (p.grave ? L.pilula('atrasado', 'Corrigir') : L.pilula('atencao', 'Conferir')) + ic('baixo', 'sm seta-det') + '</summary>' +
        '<ul>' + p.exemplos.map(function (x) { return '<li><span class="mono">' + esc(x.codigo) + '</span><span>' + esc(x.nome || '') + '</span><small>' + esc(x.detalhe) + '</small></li>'; }).join('') +
        (p.quantos > p.exemplos.length ? '<li class="muted">e mais ' + (p.quantos - p.exemplos.length) + ' na planilha de pendências</li>' : '') + '</ul></details>';
    }).join('') + '</div>';
  }

  function previaClientes() {
    var x = S.clientes, conf = x.res.conferencia, r = x.resumo;
    var amostra = x.res.registros.slice(0, 5);
    return '<section class="painel imp-previa" data-revelar><div class="painel-topo"><h2>' + ic('clientes') + ' Clientes</h2>' +
        (conf.confere ? L.pilula('ok', conf.lido + ' de ' + conf.declarado + ' lidos · confere com o relatório', 'check') : L.pilula('atrasado', 'Lidos ' + conf.lido + ', relatório diz ' + (conf.declarado == null ? '?' : conf.declarado), 'alerta')) + '</div>' +
      '<div class="painel-corpo imp-grade">' +
        '<div class="coluna">' + saude(r) + '<div class="secao"><h3>Amostra</h3><div class="tabela-wrap"><table class="tabela compacta amostra"><thead><tr><th>Cliente</th><th>WhatsApp</th><th>CPF/CNPJ</th></tr></thead><tbody>' +
          amostra.map(function (c) { return '<tr><td><strong>' + esc(c.nome) + '</strong><small>cód. ' + esc(c.codigo) + (c.cidade ? ' · ' + esc(c.cidade) : '') + '</small></td><td class="num">' + esc(c.telefoneValido ? c.telefone : '—') + '</td><td class="num">' + esc(Importacao.mascararDocumento(c.documento) || '—') + '</td></tr>'; }).join('') +
        '</tbody></table></div><p class="muted" style="font-size:var(--fs-xs);margin-top:8px">CPF aparece mascarado. Os dados ficam só neste navegador.</p></div></div>' +
        '<div class="coluna"><div class="secao"><h3>O que encontramos</h3>' + listaProblemas(r) + '</div></div>' +
      '</div></section>';
  }

  function previaProdutos() {
    var x = S.produtos, conf = x.res.conferencia, r = x.resumo, regs = x.res.registros;
    var cats = {};
    regs.forEach(function (p) { cats[p.categoria] = (cats[p.categoria] || 0) + 1; });
    var porIndice = regs.filter(function (p) { return !p.precoCentavos && p.indice > 0; });
    var ok = conferenciaOk('produtos');
    var totais = '<dl class="conferencia">' + Object.keys(NOME_TOTAL).map(function (k) {
      var d = conf.declarado[k], l = conf.lido[k], bate = conf.confere[k];
      if (d == null) return '';
      var f = function (v) { return k === 'valorEstoque' || k === 'valorVenda' ? R$(v) : NUM.format(v); };
      return '<dt>' + NOME_TOTAL[k] + '</dt><dd><span class="num">' + esc(f(l)) + '</span>' + (bate ? '<span class="bate">' + ic('check', 'sm') + 'bate</span>' : '<span class="nao-bate">' + ic('alerta', 'sm') + 'relatório: ' + esc(f(d)) + '</span>') + '</dd>';
    }).join('') + '</dl>';
    var exemplo = porIndice[0];
    var v = Dinheiro.lerReais(S.valorIndice);
    var indice = porIndice.length ? '<div class="secao indice-caixa"><h3>Preço pelo índice</h3>' +
      '<p><strong>' + porIndice.length + ' peças</strong> estão com preço 0 e índice preenchido no G-Ótica. Se a loja calcula <em>preço = índice × valor do índice</em>, informe o valor e o Lapidar calcula. Dá para deixar em branco e definir depois em Ajustes.</p>' +
      '<label class="campo"><span>Valor do índice (R$) <small class="muted">a confirmar com a loja</small></span><input class="entrada num" id="imp-indice" inputmode="decimal" placeholder="ex.: 100,00" value="' + esc(S.valorIndice) + '"></label>' +
      '<p class="muted" id="imp-indice-ex" style="font-size:var(--fs-sm)">' + exemploIndice(exemplo, v) + '</p></div>' : '';
    return '<section class="painel imp-previa" data-revelar><div class="painel-topo"><h2>' + ic('produtos') + ' Produtos</h2>' +
        (ok ? L.pilula('ok', 'Todos os totais conferem com o relatório', 'check') : L.pilula('atrasado', 'Algum total não confere', 'alerta')) + '</div>' +
      '<div class="painel-corpo imp-grade">' +
        '<div class="coluna">' + totais + saude(r) +
          '<div class="secao"><h3>Categorias</h3><div class="chips">' + Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; }).map(function (c) { return '<span class="chip estatico">' + esc(c) + ' <span class="cont">' + cats[c] + '</span></span>'; }).join('') + '</div></div>' +
          indice + '</div>' +
        '<div class="coluna"><div class="secao"><h3>O que encontramos</h3>' + listaProblemas(r) + '</div></div>' +
      '</div></section>';
  }
  function exemploIndice(p, v) {
    if (!p) return '';
    var idx = String(p.indice).replace('.', ',');
    return 'Exemplo: ' + esc(p.descricao) + ' · índice ' + esc(idx) + (v > 0 ? ' × ' + R$(v) + ' = <strong>' + R$(Math.round(p.indice * v)) + '</strong>' : '');
  }

  /* ---------- aplicar ---------- */
  function importar() {
    if (lendo()) return;
    // Grava exatamente o que a pessoa conferiu, mesmo que algo mude enquanto a confirmação está aberta.
    var sessao = S, resC = S.clientes && S.clientes.res, resP = S.produtos && S.produtos.res;
    var v = Dinheiro.lerReais(S.valorIndice);
    var qtd = [resC ? resC.registros.length + ' clientes' : '', resP ? resP.registros.length + ' produtos' : ''].filter(Boolean).join(' e ');
    var texto = L.importado()
      ? 'Atualizam ' + qtd + ' pelo código do G-Ótica. Vendas, pedidos, parcelas e cadastros feitos no Lapidar continuam.'
      : 'Entram ' + qtd + '. As vendas, pedidos, parcelas e agenda de exemplo deste navegador serão apagados. Equipe e preferências ficam. Dá para voltar aos exemplos em Ajustes.';
    L.confirmar({ titulo: 'Importar agora?', texto: esc(texto), ok: 'Importar' }).then(function (sim) {
      if (!sim || S !== sessao) return;
      var novo = Importacao.montarDados(L.D, resC, resP, L.hoje, DadosDemo);
      if (v > 0) novo.config.valorIndiceCentavos = v;
      L.D = novo;
      var gravou = L.salvar({ forcar: true });
      S.feito = { gravou: gravou, clientes: resC && resC.registros.length, produtos: resP && resP.registros.length };
      Som.tocar('sucesso');
      desenhar();
    });
  }

  function telaFeito() {
    var f = S.feito, partes = [];
    if (f.clientes != null) partes.push(f.clientes + ' clientes');
    if (f.produtos != null) partes.push(f.produtos + ' produtos');
    return '<div class="sucesso"><canvas id="imp-sucesso" aria-hidden="true"></canvas><p class="rotulo">Migração concluída</p><h3>' + esc(partes.join(' e ')) + ' no Lapidar</h3>' +
      (f.gravou ? '<p class="muted">Gravado neste navegador. Para usar em outro computador, importe lá também (ou use a versão com servidor, quando existir).</p>'
        : '<p class="status-pagamento falta">' + ic('alerta') + 'O navegador não deixou gravar (sem espaço ou modo privado). Os dados ficam até fechar esta aba.</p>') +
      '<ul class="efeitos"><li style="--i:0">' + ic('check') + '<span>Clientes e produtos conferidos com os totais do relatório</span></li>' +
        '<li style="--i:1">' + ic('alerta') + '<span>Cadastros com pendência ganharam a etiqueta “Revisar”</span></li>' +
        '<li style="--i:2">' + ic('doc') + '<span>A planilha de pendências lista o que corrigir, cadastro por cadastro</span></li></ul>' +
      '<div class="folha-acoes" style="justify-content:center">' +
        '<button class="btn" data-pendencias>' + ic('baixar') + 'Planilha de pendências</button>' +
        (f.clientes != null ? '<button class="btn" data-ver="clientes">' + ic('clientes') + 'Ver clientes</button>' : '') +
        (f.produtos != null ? '<button class="btn" data-ver="produtos">' + ic('produtos') + 'Ver produtos</button>' : '') +
        '<button class="btn ouro" data-ver="hoje">Ir para Hoje' + ic('dir', 'sm') + '</button></div></div>';
  }

  /* Planilha (CSV) montada a partir do que está gravado: serve também depois, em Ajustes ou na tela Hoje. */
  L.planilhaPendencias = function () {
    var linhas = [['Cadastro', 'Código', 'Nome ou descrição', 'Problema']];
    L.D.clientes.forEach(function (c) { (c.importacao || []).forEach(function (t) { linhas.push(['Cliente', c.codigoAntigo || '', c.nome, t]); }); });
    L.D.produtos.forEach(function (p) { (p.importacao || []).forEach(function (t) { linhas.push(['Produto', String(p.sku || '').replace(/^GO-/, ''), p.nome, t]); }); });
    if (linhas.length === 1) { L.toast('Nenhuma pendência da migração.'); return; }
    L.baixar('pendencias-migracao-' + L.hoje + '.csv', Csv.gerar(linhas));
  };

  /* ---------- eventos ---------- */
  function aoClicar(e) {
    var t;
    if ((t = e.target.closest('[data-trocar]'))) { S[t.dataset.trocar] = null; Som.tocar('fechar'); desenhar(); return; }
    if ((t = e.target.closest('[data-descartar]'))) { S.lendo.splice(Number(t.dataset.descartar), 1); desenhar(); return; }
    if (e.target.closest('[data-importar]')) { importar(); return; }
    if (e.target.closest('[data-pendencias]')) { L.planilhaPendencias(); return; }
    if ((t = e.target.closest('[data-ver]'))) { L.fecharCamada(camada, true); L.ir(t.dataset.ver, null, { forcarAnimacao: true }); return; }
    if ((t = e.target.closest('details.problema summary'))) Som.tocar('clique');
  }
  function aoMudar(e) {
    if (e.target.id === 'imp-arquivo') {
      Array.prototype.forEach.call(e.target.files || [], lerArquivo);
      e.target.value = '';
    }
  }
  function aoDigitar(e) {
    if (e.target.id !== 'imp-indice') return;
    S.valorIndice = e.target.value;
    var regs = S.produtos ? S.produtos.res.registros : [];
    var ex = regs.filter(function (p) { return !p.precoCentavos && p.indice > 0; })[0];
    var alvo = L.$('#imp-indice-ex', folha);
    if (alvo) alvo.innerHTML = exemploIndice(ex, Dinheiro.lerReais(S.valorIndice));
  }
})(L);
