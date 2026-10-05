/* Importação dos relatórios do G-Ótica (HPR Sistemas), o sistema que a loja usava antes do Vendaro.
   Entrada: os pedaços de texto do PDF com posição, na ordem em que foram desenhados
   ({ p: página, x, y: distância do topo, w: largura, s: texto }), exatamente como o pdf.js entrega.
   Saída: registros limpos + lista de problemas para a pessoa revisar ANTES de importar.

   Por que a ordem de desenho importa: no relatório de estoque cada produto é um bloco que começa
   no código do grupo e termina na marca. Índice e peso às vezes são desenhados uma linha abaixo,
   na altura do produto seguinte. Ordenar só pela posição na página trocaria o peso de dono. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Importacao = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------ números e textos ------------------------------ */
  function decimalBR(s) {
    var t = String(s == null ? '' : s).trim();
    if (!/^-?[\d.]*\d(,\d+)?$/.test(t)) return null;
    return Number(t.replace(/\./g, '').replace(',', '.'));
  }
  function centavosBR(s) { var n = decimalBR(s); return n == null ? null : Math.round(n * 100); }

  var MINUSCULAS = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, com: 1, em: 1, para: 1, a: 1, o: 1 };
  /* "ANA PAULA DE OLIVEIRA" → "Ana Paula de Oliveira". Código com número fica como está (18TA2523RP). */
  function titulo(s) {
    return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase().split(' ').map(function (p, i) {
      if (/\d/.test(p)) return p.toUpperCase();
      if (i > 0 && MINUSCULAS[p]) return p;
      return p.replace(/^(\(?)(\p{L})/u, function (_, a, b) { return a + b.toUpperCase(); });
    }).join(' ');
  }
  var CIDADES = { IJUI: 'Ijuí', 'SANTO ANGELO': 'Santo Ângelo', 'CRUZ ALTA': 'Cruz Alta', 'PANAMBI': 'Panambi', 'AUGUSTO PESTANA': 'Augusto Pestana', 'CATUIPE': 'Catuípe', 'CORONEL BARROS': 'Coronel Barros', 'AJURICABA': 'Ajuricaba', 'SARANDI': 'Sarandi', 'PORTO ALEGRE': 'Porto Alegre', 'SANTA ROSA': 'Santa Rosa', 'PASSO FUNDO': 'Passo Fundo', 'BOZANO': 'Bozano', 'CONDOR': 'Condor',
    JOIA: 'Jóia', 'EUGENIO DE CASTRO': 'Eugênio de Castro', 'SAO BORJA': 'São Borja', 'PALMEIRA DAS MISSOES': 'Palmeira das Missões',
    'QUEDAS DO IGUACU': 'Quedas do Iguaçu', GOIANIA: 'Goiânia', 'BALNEARIO CAMBORIU': 'Balneário Camboriú', TUPANCIRETA: 'Tupanciretã',
    'ANTONIO PRADO': 'Antônio Prado', 'ENTRE-IJUIS': 'Entre-Ijuís', 'ESPERANCA DO SUL': 'Esperança do Sul', 'SAO LUIZ GONZAGA': 'São Luiz Gonzaga',
    'SAO PAULO': 'São Paulo', 'SANTO ANTONIO DAS MISSOES': 'Santo Antônio das Missões', 'TRES PASSOS': 'Três Passos', 'SAO MIGUEL DAS MISSOES': 'São Miguel das Missões' };
  function cidade(s) {
    var t = String(s || '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return CIDADES[t] || titulo(s);
  }

  /* ------------------------------ documentos ------------------------------ */
  function digitos(s) { return String(s || '').replace(/\D/g, ''); }
  function cpfValido(d) {
    if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
    for (var t = 9; t < 11; t++) {
      var soma = 0;
      for (var i = 0; i < t; i++) soma += Number(d[i]) * (t + 1 - i);
      if (((soma * 10) % 11) % 10 !== Number(d[t])) return false;
    }
    return true;
  }
  function cnpjValido(d) {
    if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
    function dv(base) {
      var pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      var soma = 0;
      for (var i = 0; i < pesos.length; i++) soma += Number(base[i]) * pesos[i];
      var r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    }
    return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13]);
  }
  function documento(s) {
    var d = digitos(s);
    if (!d) return { tipo: null, digitos: '', valido: false, formatado: '' };
    if (d.length === 11) return { tipo: 'cpf', digitos: d, valido: cpfValido(d), formatado: d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') };
    if (d.length === 14) return { tipo: 'cnpj', digitos: d, valido: cnpjValido(d), formatado: d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') };
    return { tipo: 'desconhecido', digitos: d, valido: false, formatado: String(s).trim() };
  }
  function mascararDocumento(doc) {
    if (!doc || !doc.digitos) return '';
    if (doc.tipo === 'cpf') return '***.' + doc.digitos.slice(3, 6) + '.' + doc.digitos.slice(6, 9) + '-**';
    if (doc.tipo === 'cnpj') return doc.formatado; // CNPJ é público
    return doc.digitos.replace(/\d(?=\d{3})/g, '*'); // número fora do padrão: só os 3 últimos
  }

  /* ------------------------------ telefone ------------------------------ */
  /* Celular no Brasil tem 9 dígitos começando com 9. Cadastro antigo costuma ter 8 dígitos
     (antes de 2016 no RS) e às vezes vem sem DDD ou com zero na frente. */
  function telefone(s, dddPadrao) {
    dddPadrao = dddPadrao || '55';
    var bruto = String(s || '').trim();
    var d = digitos(bruto), avisos = [];
    if (!d) return { digitos: '', formatado: '', valido: false, avisos: ['sem telefone'] };
    if (d.length > 11 && d[0] === '0') d = d.replace(/^0+/, '');
    if (d.length === 13 && d.slice(0, 2) === '55') d = d.slice(2);
    if (d.length === 11 && d[0] === '0') d = d.slice(1);
    if (d.length === 8 || d.length === 9) { d = dddPadrao + d; avisos.push('sem DDD: assumido ' + dddPadrao); }
    if (d.length === 10 && /[6-9]/.test(d[2])) { d = d.slice(0, 2) + '9' + d.slice(2); avisos.push('celular com 8 dígitos: incluído o 9'); }
    var local = d.length === 11 ? d.slice(3) : d.slice(2);
    var valido = ((d.length === 11 && d[2] === '9') || (d.length === 10 && /[2-5]/.test(d[2]))) && !/^(\d)\1+$/.test(local);
    if (!valido) return { digitos: d, formatado: bruto, valido: false, avisos: ['telefone incompleto ou inválido'] };
    var f = d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7) : '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return { digitos: d, formatado: f, valido: true, avisos: avisos };
  }

  /* ------------------------------ datas ------------------------------ */
  function dataBR(s, anoAtual) {
    var m = String(s || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return { iso: null, valida: false };
    var dia = Number(m[1]), mes = Number(m[2]), ano = Number(m[3]);
    var dt = new Date(Date.UTC(ano, mes - 1, dia));
    var real = dt.getUTCFullYear() === ano && dt.getUTCMonth() === mes - 1 && dt.getUTCDate() === dia;
    var plausivel = real && ano >= 1900 && ano <= (anoAtual || 2100);
    return { iso: real ? m[3] + '-' + m[2] + '-' + m[1] : null, valida: plausivel };
  }

  /* ------------------------------ estrutura do PDF ------------------------------ */
  function textoDe(itens) { return itens.map(function (i) { return i.s; }).join(' '); }
  function detectar(itens) {
    var t = textoDe(itens.slice(0, 40)).toUpperCase();
    if (t.indexOf('CADASTRO DE CLIENTES') >= 0) return 'clientes';
    if (t.indexOf('POSIÇÃO DO ESTOQUE') >= 0 || t.indexOf('POSICAO DO ESTOQUE') >= 0) return 'produtos';
    return null;
  }

  /* Cabeçalho e rodapé de cada página saem fora: só fica o miolo da tabela.
     O rodapé é cortado item a item, não por faixa: o último produto de uma página
     chega a desenhar o peso 1 ponto acima do "G-Ótica - HPR Sistemas". */
  /* O número da página é reconhecido pela posição, logo à direita de "Página:". Um peso ou índice
     igual ao número da página, desenhado na mesma altura, continua sendo do produto. */
  function ehRodape(i, rod, pag) {
    if (!rod) return false;
    var s = i.s.trim();
    if (i.y > rod.y + 6) return true;
    if (Math.abs(i.y - rod.y) > 4) return false;
    if (/^G-Ótica/i.test(s) || /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}(:\d{2})?$/.test(s) || /^Página:?\s*\d*$/i.test(s)) return true;
    return !!pag && s === String(i.p) && Math.abs(i.y - pag.y) <= 2 && i.x >= pag.x + pag.w - 3 && i.x <= pag.x + pag.w + 12;
  }
  function miolo(itens, rotuloCabecalho) {
    var porPagina = {};
    itens.forEach(function (i, k) { i.k = i.k == null ? k : i.k; (porPagina[i.p] = porPagina[i.p] || []).push(i); });
    var saida = [], declarados = [];
    Object.keys(porPagina).map(Number).sort(function (a, b) { return a - b; }).forEach(function (p) {
      var lista = porPagina[p];
      var cab = lista.filter(function (i) { return i.s.trim() === rotuloCabecalho; })[0];
      var rod = lista.filter(function (i) { return /^G-Ótica/i.test(i.s.trim()); })[0];
      var pag = lista.filter(function (i) { return /^Página:?$/i.test(i.s.trim()); })[0];
      var topo = cab ? cab.y + 6 : 0;
      lista.forEach(function (i) {
        if (i.y <= topo || ehRodape(i, rod, pag)) return;
        saida.push(i);
      });
    });
    saida.sort(function (a, b) { return a.p - b.p || a.k - b.k; });
    // Linha de totais do fim do relatório sai do miolo e vira conferência.
    var iTotal = -1;
    for (var n = 0; n < saida.length; n++) if (/^Total (Itens|Clientes) Listados/i.test(saida[n].s.trim())) { iTotal = n; break; }
    if (iTotal >= 0) {
      var linhaY = saida[iTotal].y, pag = saida[iTotal].p, kMin = saida[iTotal].k - 2;
      declarados = saida.filter(function (i) { return i.p === pag && i.y >= linhaY - 3 && i.y <= linhaY + 16 && i.k >= kMin; });
      saida = saida.filter(function (i) { return declarados.indexOf(i) < 0; });
    }
    return { itens: saida, totais: declarados };
  }

  function direita(i) { return i.x + i.w; }
  function ehNumero(s) { return decimalBR(s) != null; }

  /* ------------------------------ textos colados ------------------------------ */
  /* O pdf.js junta dois textos vizinhos num pedaço só quando um termina onde o outro começa:
     "...DA SILVARUA DAS FLORES" é nome + endereço. Para separar, estima onde cada letra termina
     (larguras da Helvetica, escaladas para a largura real do pedaço) e corta na letra que cai
     no início da coluna vizinha. Só corta se essa coluna estiver vazia na linha e o corte cair
     a menos de 1,2 ponto do início dela: um nome comprido que só invade a coluna fica inteiro. */
  var LARG = { ' ': 278, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, '.': 278, ',': 278, '-': 333, '/': 278, ':': 278, '(': 333, ')': 333, '&': 667, "'": 191 };
  function larguraLetra(ch) {
    var b = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/\d/.test(b)) return 556;
    if (LARG[b] != null) return LARG[b];
    return /[a-z]/.test(b) ? 520 : 556;
  }
  function cortarEm(i, inicio, coluna) {
    var letras = Array.from(i.s), ws = letras.map(larguraLetra);
    var total = ws.reduce(function (a, b) { return a + b; }, 0);
    if (!total || !i.w) return null;
    var esc = i.w / total, x = i.x, melhor = null;
    for (var k = 1; k < letras.length; k++) {
      x += ws[k - 1] * esc;
      if (!melhor || Math.abs(x - inicio) < Math.abs(melhor.x - inicio)) melhor = { k: k, x: x };
    }
    if (!melhor || Math.abs(melhor.x - inicio) > 1.2) return null;
    var antes = letras.slice(0, melhor.k).join(''), depois = letras.slice(melhor.k).join('');
    if (depois.trim().length < 2 || !antes.trim()) return null;
    // Geometria de colagem sem sinal de fronteira: não corta, mas avisa para alguém conferir.
    if (!fronteira(antes, depois, coluna)) { i.suspeito = true; return null; }
    var wAntes = melhor.x - i.x;
    return [
      { p: i.p, x: i.x, y: i.y, w: wAntes, s: antes.replace(/\s+$/, ''), k: i.k, colado: true },
      { p: i.p, x: melhor.x, y: i.y, w: i.w - wAntes, s: depois.replace(/^\s+/, ''), k: i.k + 0.5, colado: true }
    ];
  }
  /* A posição sozinha não basta: um nome comprido também cruza a coluna e cairia num corte
     "SOAR|ES". Só corta onde há sinal de dois textos: espaço antes, troca letra↔número
     ("MISSOES|0559...") ou o começo típico de um endereço ou cidade ("SILVA|RUA ..."). */
  var COMECO = /^((RUA|AV|AVENIDA|TRAVESSA|TV|ESTRADA|LINHA|RODOVIA|ALAMEDA|PRA[CÇ]A|LOTEAMENTO|VILA|BAIRRO|CONDOM[IÍ]NIO|ESQUINA|IJUI|IJUÍ)\b|(R|AV|TRAV|EST|ROD|AL)\.)/;
  function fronteira(antes, depois, coluna) {
    if (/\s$/.test(antes)) return true;
    var a = antes.slice(-1), d = depois.charAt(0);
    if (/\d/.test(a) !== /\d/.test(d)) return true;
    if (coluna === 'fone' && /^[(+]/.test(depois)) return true;
    if (coluna === 'cidade') {
      var t = depois.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (Object.keys(CIDADES).some(function (k) { return t.indexOf(k) === 0; })) return true;
    }
    return COMECO.test(depois.toUpperCase());
  }
  /* inicios: [{ x: onde o texto da coluna começa, de, ate }] da esquerda para a direita. */
  function separarColados(itens, colunas) {
    var saida = [];
    function ocupada(c, i) {
      return itens.some(function (o) { return o !== i && o.p === i.p && Math.abs(o.y - i.y) < 2 && o.x >= c.de && o.x < c.ate; });
    }
    itens.forEach(function (i) {
      var pendente = [i];
      while (pendente.length) {
        var atual = pendente.shift(), feito = false;
        for (var n = 0; n < colunas.length && !feito; n++) {
          var c = colunas[n];
          if (c.x <= atual.x + 1 || atual.x + atual.w <= c.x + 1 || ocupada(c, i)) continue;
          var partes = cortarEm(atual, c.x, c.nome);
          if (partes) { saida.push(partes[0]); pendente.unshift(partes[1]); feito = true; }
        }
        if (!feito) saida.push(atual);
      }
    });
    return saida;
  }
  /* Início do texto de cada coluna = posição mais comum dentro da faixa dela. */
  function iniciosDasColunas(itens, faixas) {
    return faixas.map(function (f) {
      var conta = {}, melhor = null;
      itens.forEach(function (i) { if (i.x >= f[1] && i.x < f[2]) { var k = Math.round(i.x); conta[k] = (conta[k] || 0) + 1; } });
      Object.keys(conta).forEach(function (k) { if (melhor == null || conta[k] > conta[melhor]) melhor = k; });
      return { nome: f[0], x: melhor == null ? f[1] : Number(melhor), de: f[1], ate: f[2] };
    });
  }

  /* ------------------------------ clientes ------------------------------ */
  var COL_CLI = [['nome', 55, 215], ['endereco', 215, 355], ['cidade', 355, 455], ['fone', 455, 526], ['documento', 526, 600], ['mensalidade', 600, 690], ['nascimento', 690, 800]];

  function lerClientes(itensBrutos, opcoes) {
    opcoes = opcoes || {};
    var m = miolo(itensBrutos, 'Código');
    var registros = [], atual = null, naoReconhecidos = [];
    // Só endereço, cidade e fone recebem texto colado do vizinho da esquerda.
    var colunas = iniciosDasColunas(m.itens, COL_CLI).filter(function (c) { return /^(endereco|cidade|fone)$/.test(c.nome); });
    separarColados(m.itens, colunas).forEach(function (i) {
      var s = i.s.trim();
      if (i.x < 52 && /^\d+$/.test(s)) {
        atual = { codigo: s, pagina: i.p, campos: {} };
        registros.push(atual);
        return;
      }
      if (!atual) { naoReconhecidos.push(i); return; }
      if (i.colado) atual.colado = true;
      if (i.suspeito) atual.suspeito = true;
      var col = COL_CLI.filter(function (c) { return i.x >= c[1] && i.x < c[2]; })[0];
      if (!col) { naoReconhecidos.push(i); return; }
      // CPF vazio vem picado em ". . / -": junta tudo e decide depois.
      atual.campos[col[0]] = atual.campos[col[0]] ? atual.campos[col[0]] + (col[0] === 'documento' ? '' : ' ') + s : s;
    });

    var totalDeclarado = null;
    m.totais.forEach(function (t, n) { if (/Total Clientes Listados/i.test(t.s)) { var prox = m.totais.filter(function (x) { return /^\d+$/.test(x.s.trim()); })[0]; if (prox) totalDeclarado = Number(prox.s.trim()); } void n; });

    var anoAtual = opcoes.anoAtual || 2100;
    var clientes = registros.map(function (r) {
      var c = r.campos, avisos = [], erros = [];
      var nome = titulo(c.nome || '');
      if (!nome) prob(erros, 'sem-nome', 'sem nome');
      var tel = telefone(c.fone, opcoes.ddd);
      tel.avisos.forEach(function (a) {
        if (a === 'telefone incompleto ou inválido') prob(erros, 'telefone-invalido', a + (c.fone ? ' (' + c.fone + ')' : ''));
        else if (a === 'sem telefone') prob(avisos, 'sem-telefone', a);
        else if (/^sem DDD/.test(a)) prob(avisos, 'sem-ddd', a);
        else prob(avisos, 'celular-8-digitos', a + ' → ' + tel.formatado);
      });
      var doc = documento((c.documento || '').replace(/[ .\/-]+$/, '').trim() === '' ? '' : c.documento);
      if (!doc.digitos) prob(avisos, 'sem-documento', 'sem CPF/CNPJ');
      else if (!doc.valido) prob(erros, 'documento-invalido', (doc.tipo === 'cnpj' ? 'CNPJ' : doc.tipo === 'cpf' ? 'CPF' : 'documento') + ' inválido (dígito verificador não confere)');
      var nasc = c.nascimento ? dataBR(c.nascimento, anoAtual) : { iso: null, valida: false };
      if (!c.nascimento) prob(avisos, 'sem-nascimento', 'sem data de nascimento');
      else if (!nasc.valida) prob(erros, 'nascimento-invalido', 'data de nascimento impossível (' + c.nascimento + ')');
      var end = (c.endereco || '').trim();
      if (!end) prob(avisos, 'sem-endereco', 'sem endereço');
      else if (/^(RUA|AV|AVENIDA|SEM NOME)\.?$/i.test(end)) prob(avisos, 'endereco-incompleto', 'endereço incompleto ("' + end + '")');
      // O relatório corta nomes longos de cidade ("BOA VISTA DO"): não dá para adivinhar qual é.
      if (/\s(DO|DA|DE|DOS|DAS)$/i.test((c.cidade || '').trim())) prob(avisos, 'cidade-incompleta', 'cidade cortada no relatório ("' + c.cidade.trim() + '")');
      if (r.colado) prob(avisos, 'campos-separados', 'nome, endereço, cidade ou telefone vinham grudados no PDF e foram separados: confira');
      else if (r.suspeito) prob(avisos, 'campos-suspeitos', 'um texto invade a coluna vizinha (nome comprido ou campos grudados): confira nome, endereço, cidade e telefone');
      var mens = centavosBR(c.mensalidade || '0');
      return {
        codigo: r.codigo, pagina: r.pagina, nome: nome, endereco: end ? titulo(end) : '', cidade: c.cidade ? cidade(c.cidade) : '',
        telefone: tel.valido ? tel.formatado : (c.fone || ''), telefoneDigitos: tel.digitos, telefoneValido: tel.valido,
        documento: doc, nascimento: nasc.valida ? nasc.iso : null, mensalidadeCentavos: mens || 0,
        pessoa: doc.tipo === 'cnpj' ? 'juridica' : 'fisica', avisos: avisos, erros: erros, original: c
      };
    });

    // Duplicados: mesmo documento válido, mesmo telefone ou mesmo nome + nascimento.
    marcarDuplicados(clientes, function (c) { return c.documento.valido ? 'doc:' + c.documento.digitos : null; }, 'mesmo CPF/CNPJ de');
    marcarDuplicados(clientes, function (c) { return c.telefoneValido ? 'tel:' + c.telefoneDigitos : null; }, 'mesmo telefone de');
    marcarDuplicados(clientes, function (c) { return c.nascimento ? 'nn:' + c.nome.toLowerCase() + c.nascimento : null; }, 'mesmo nome e nascimento de');
    marcarDuplicados(clientes, function (c) { return 'cod:' + c.codigo; }, 'mesmo código de');

    return {
      tipo: 'clientes', registros: clientes, naoReconhecidos: naoReconhecidos,
      conferencia: { declarado: totalDeclarado, lido: clientes.length, confere: totalDeclarado == null ? null : totalDeclarado === clientes.length }
    };
  }

  /* Cada problema tem uma chave (para agrupar na prévia) e um texto (para a pessoa ler). */
  function prob(lista, chave, texto) { lista.push({ c: chave, t: texto }); }

  function marcarDuplicados(lista, chave, rotulo) {
    var vistos = {};
    lista.forEach(function (r) {
      var k = chave(r);
      if (!k) return;
      if (vistos[k]) {
        var outro = vistos[k];
        prob(r.avisos, 'duplicado', 'possível duplicado: ' + rotulo + ' ' + (outro.nome || outro.descricao) + ' (cód. ' + outro.codigo + ')');
        r.duplicadoDe = r.duplicadoDe || outro.codigo;
      } else vistos[k] = r;
    });
  }

  /* ------------------------------ produtos ------------------------------ */
  var CATEGORIAS = [
    [/\bALIAN[CÇ]A/, 'Alianças', 'joia', 'aliancas'],
    [/\b(ANEL|ANEIS|ANÉIS|SOLITARIO|SOLITÁRIO)\b/, 'Anéis', 'joia', 'anel'],
    [/\b(BRINCOS?|ARGOLAS?|PIERCING|EAR ?CUFF)\b/, 'Brincos', 'joia', 'brinco'],
    [/\b(PING|PINGENTES?|MEDALHA|CRUCIFIXO|ESCAPUL[AÁ]RIO)\b/, 'Pingentes', 'joia', 'pingente'],
    [/\b(CORRENTES?|COLAR|COLARES|GARGANTILHA|CORD[AÃ]O|CHOKER|MELINDROSA)\b/, 'Colares', 'joia', 'colar'],
    [/\b(PULSEIRAS?|BRACELETE|TORNOZELEIRA|ESCRAVA)\b/, 'Pulseiras', 'joia', 'pulseira'],
    [/\b(REL[OÓ]GIO|RELOGIOS)\b/, 'Relógios', 'joia', 'relogio'],
    // Joalheria gaúcha: cuia e bomba de chimarrão com ouro e prata ("BAMBA" é erro de digitação comum no cadastro).
    [/\b(CUIAS?|BOMBAS?|BAMBA)\b/, 'Cuias e bombas', 'joia', 'chimarrao'],
    [/\b(FECHOS?|ARGOLINHA|TARRAXAS?|PINO)\b/, 'Peças e fechos', 'joia', 'servico'],
    [/\b(PLACA|PERSONALIZAD[AO]|NOME EM)\b/, 'Personalizados', 'joia', 'pingente'],
    [/\b(SOLAR|SOLA|POLARIZADO)\b/, 'Óculos de sol', 'otica', 'sol'],
    [/\b(LENTE DE CONTATO|LC )\b/, 'Lentes de contato', 'otica', 'contato'],
    [/\b(LENTES?|MULTIFOCAL|BIFOCAL|VISAO SIMPLES)\b/, 'Lentes', 'otica', 'lente'],
    [/\b(ARMA[CÇ][AÃ]O|OCULOS|ÓCULOS|NIKE|RAY.?BAN|OAKLEY|VOGUE|ARMANI|PRADA|GUESS|TOMMY|LACOSTE|CALVIN|EMPORIO|ATITUDE|HB|POLO|COLCCI|CARRERA|DIESEL)\b/, 'Armações', 'otica', 'armacao'],
    [/\b(ESTOJO|FLANELA|CORDINHA|SOLU[CÇ][AÃ]O|LIMPA)\b/, 'Acessórios', 'otica', 'frasco']
  ];
  /* A primeira palavra costuma dizer o que é a peça ("ANEL ...", "PING 750 ..."), mesmo quando a
     descrição cita outra coisa depois ("ANEL ... MEIA ALIANÇA", "ÓCULOS DE SOL ... LENTE MARROM").
     O cadastro tem muito erro de digitação (PULSERIA, PINGNETE, AENL, CORFRFENTE): aceita até 1 ou 2 letras trocadas. */
  var NOMES = [
    ['ANEL', 'Anéis'], ['ANEIS', 'Anéis'], ['SOLITARIO', 'Anéis'], ['ALIANCA', 'Alianças'], ['ALIANCAS', 'Alianças'],
    ['BRINCO', 'Brincos'], ['BRINCOS', 'Brincos'], ['ARGOLA', 'Brincos'], ['PIERCING', 'Brincos'],
    ['PINGENTE', 'Pingentes'], ['PING', 'Pingentes'], ['PINGE', 'Pingentes'], ['MEDALHA', 'Pingentes'], ['CRUCIFIXO', 'Pingentes'],
    ['CORRENTE', 'Colares'], ['COLAR', 'Colares'], ['GARGANTILHA', 'Colares'], ['CORDAO', 'Colares'], ['VENEZIANA', 'Colares'],
    ['MELINDROSA', 'Colares'], ['CHOKER', 'Colares'], ['ESCAPULARIO', 'Colares'],
    ['PULSEIRA', 'Pulseiras'], ['PULS', 'Pulseiras'], ['BRACELETE', 'Pulseiras'], ['ESCRAVA', 'Pulseiras'], ['TORNOZELEIRA', 'Pulseiras'],
    ['RELOGIO', 'Relógios'], ['CUIA', 'Cuias e bombas'], ['BOMBA', 'Cuias e bombas'],
    ['LENTE', 'Lentes'], ['LENTES', 'Lentes'], ['RECEITUARIO', 'Armações'], ['ARMACAO', 'Armações'],
    ['FECHO', 'Peças e fechos'], ['SEPARADOR', 'Peças e fechos'], ['PLACA', 'Personalizados']
  ];
  var DADOS_CAT = {
    'Anéis': ['joia', 'anel'], 'Alianças': ['joia', 'aliancas'], 'Brincos': ['joia', 'brinco'], 'Pingentes': ['joia', 'pingente'],
    'Colares': ['joia', 'colar'], 'Pulseiras': ['joia', 'pulseira'], 'Relógios': ['joia', 'relogio'], 'Cuias e bombas': ['joia', 'chimarrao'],
    'Peças e fechos': ['joia', 'servico'], 'Personalizados': ['joia', 'pingente'], 'Lentes': ['otica', 'lente'], 'Lentes de contato': ['otica', 'contato'],
    'Óculos de sol': ['otica', 'sol'], 'Armações': ['otica', 'armacao'], 'Acessórios': ['otica', 'frasco']
  };
  function semAcento(t) { return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }
  function distancia(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) d[i] = [i];
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }
  function comCategoria(nome) { var x = DADOS_CAT[nome]; return { categoria: nome, segmento: x[0], ilustracao: x[1] }; }
  function ehOculosDeSol(d) { return /\b(SOLAR|SOLA|SOL|POLARIZADO|SUNGLASS)\b/.test(d); }

  /* Palavras que decidem sozinhas e não podem cair na tolerância a erro de outra categoria
     (SOLAR não é COLAR, PINO não é PING). */
  var EXATAS = {
    SOLAR: 'Óculos de sol', POLARIZADO: 'Óculos de sol',
    ESTOJO: 'Acessórios', FLANELA: 'Acessórios', CORDINHA: 'Acessórios', LIMPA: 'Acessórios', LIMPADOR: 'Acessórios', SOLUCAO: 'Acessórios', SPRAY: 'Acessórios',
    PINO: 'Peças e fechos', TARRAXA: 'Peças e fechos', TARRACHA: 'Peças e fechos'
  };
  function categoria(desc) {
    var d = semAcento(desc);
    var primeira = (d.match(/^[A-Z][A-Z-]*/) || [''])[0].replace(/-+$/, '');
    // Lente de contato não vai para o laboratório: é produto de prateleira.
    if (/^(LENTES? DE CONTATO|LC)\b/.test(d)) return comCategoria('Lentes de contato');
    if (EXATAS[primeira]) return comCategoria(EXATAS[primeira]);
    if (primeira === 'CORDAO' && /\bOCULOS\b/.test(d)) return comCategoria('Acessórios');
    if (/^(OCULOS|OCULSO|OCLUOS|OCULO)$/.test(primeira) || /^(PROVOQ|NIKE|RAYBAN|RAY|OAKLEY|VOGUE|CARRERA|ATITUDE|EVOKE|SECRET|TOMMY|GUESS|POLAROID|CHILLI)$/.test(primeira)) {
      return comCategoria(ehOculosDeSol(d) ? 'Óculos de sol' : 'Armações');
    }
    if (primeira.length >= 3) {
      var melhor = null;
      NOMES.forEach(function (n) {
        var nome = n[0];
        var dist = primeira.indexOf(nome) === 0 && nome.length >= 4 ? 0 : distancia(primeira, nome);
        // Erro de digitação raramente troca a primeira letra ("AENL", "PULSERIA", "CORFRFENTE").
        var limite = primeira[0] !== nome[0] ? 0 : nome.length >= 7 ? 2 : nome.length >= 4 ? 1 : 0;
        if (dist <= limite && (!melhor || dist < melhor.dist)) melhor = { dist: dist, cat: n[1] };
      });
      if (melhor) return comCategoria(melhor.cat);
    }
    if (/\bOCULOS\b/.test(d)) return comCategoria(ehOculosDeSol(d) ? 'Óculos de sol' : 'Armações');
    for (var i = 0; i < CATEGORIAS.length; i++) if (CATEGORIAS[i][0].test(d)) return comCategoria(CATEGORIAS[i][1]);
    return null;
  }
  function metal(desc) {
    var d = ' ' + desc.toUpperCase() + ' ';
    if (/\b750\b|18K|OURO 18/.test(d)) return 'Ouro 18k (750)';
    if (/\b416\b|10K/.test(d)) return 'Ouro 10k (416)';
    if (/\b585\b|14K/.test(d)) return 'Ouro 14k (585)';
    if (/PRATA|\b925\b|\b950\b/.test(d)) return 'Prata';
    if (/\bA[CÇ]O\b/.test(d)) return 'Aço';
    if (/FOLHEAD|BANHAD|SEMIJOIA/.test(d)) return 'Folheado';
    return null;
  }
  var PEDRAS = [[/BRILHANTE|DIAMANTE/, 'Diamante'], [/ZIRC/, 'Zircônia'], [/P[EÉ]ROLA/, 'Pérola'], [/SAFIRA/, 'Safira'], [/ESMERALDA/, 'Esmeralda'], [/RUBI/, 'Rubi'], [/[AÁ]GUA MARINHA/, 'Água-marinha'], [/AMETISTA/, 'Ametista'], [/TOPAZIO|TOPÁZIO/, 'Topázio'], [/CRISTAL/, 'Cristal']];
  function pedras(desc) {
    var d = desc.toUpperCase(), r = [];
    PEDRAS.forEach(function (p) { if (p[0].test(d)) r.push(p[1]); });
    return r.join(', ');
  }
  /* "54--19---140" ou "51-20---140": aro, ponte e haste da armação. */
  function medidasArmacao(desc) {
    var m = desc.match(/\b(\d{2})\s*[-*x□#]+\s*(\d{2})\s*[-*x#\s]+\s*(\d{3})\b/i);
    return m ? m[1] + '□' + m[2] + ' ' + m[3] : null;
  }
  /* "P: 4,37G" ou "P; 3,89G" na descrição: peso escrito à mão, para conferir com o campo. */
  function pesoNaDescricao(desc) {
    var m = desc.toUpperCase().match(/\bP\s*[:;]?\s*(\d+[.,]\d+)\s*G\b/);
    return m ? decimalBR(m[1].replace('.', ',')) : null;
  }

  /* Colunas numéricas são alinhadas à direita: classifica pela borda direita.
     Textos dependem da linha: na linha do rótulo "Fornecedor:" é fornecedor; na linha da
     descrição é pedaço da descrição (ex.: "OCULOS REC. VOCH" + "8112" + "47*16-130 C243"). */
  function classificarNumero(i) {
    var dir = direita(i);
    // Quantidade é curta e encostada na coluna: um número que começa antes (ex.: haste "146" de uma
    // armação, quebrada no fim da descrição) é texto, mesmo terminando no mesmo lugar.
    if (dir >= 395 && dir <= 426 && i.x >= 390) return 'qtd';
    if (dir > 505 && dir <= 545) return 'custo';
    if (dir > 545 && dir <= 600 && i.x < 598) return 'valorEstoque';
    if (i.x >= 598 && i.x < 615) return 'aliquota';
    if (dir > 615 && dir <= 676) return 'preco';
    if (i.x >= 676 && i.x < 720) return 'minimo';
    if (i.x >= 720 && i.x < 760 && dir < 770) return 'indice';
    if (dir >= 770 && dir <= 810) return 'peso';
    return null;
  }

  function montarProduto(b) {
    var rotF = b.itens.filter(function (i) { return i.s.trim() === 'Fornecedor:'; })[0];
    var rotS = b.itens.filter(function (i) { return i.s.trim() === 'SubTipo:'; })[0];
    var partes = {}, descricao = [], fornecedor = [], subtipo = [], estranhos = [], indices = [], pesos = [];
    b.itens.forEach(function (i) {
      var s = i.s.trim(), num = ehNumero(s);
      if (s === 'SubTipo:' || s === 'Fornecedor:' || s === '**') return;
      var naLinhaDoAnc = Math.abs(i.y - b.y) <= 3;
      if (naLinhaDoAnc && i.x >= 52 && i.x < 78 && /^\d{2}$/.test(s) && b.sub == null) { b.sub = s; return; }
      if (naLinhaDoAnc && i.x >= 78 && i.x < 150 && /^\d+$/.test(s) && b.codigo == null) { b.codigo = s; return; }
      var naLinhaF = rotF && Math.abs(i.y - rotF.y) <= 3, naLinhaS = rotS && Math.abs(i.y - rotS.y) <= 3;
      if (i.x >= 720 && !num) { partes.marca = s; return; }
      if (naLinhaF && !num && i.x >= 200 && i.x < 400) { fornecedor.push(i); return; }
      if (naLinhaS && !num && i.x >= 60 && i.x < 155) { subtipo.push(s); return; }
      if (num) {
        // Número numa coluna numérica é valor; fora delas (ex.: "8112" no meio do texto) é pedaço da descrição.
        var col = classificarNumero(i);
        if (col === 'indice') { indices.push(i); return; }
        if (col === 'peso') { pesos.push(i); return; }
        if (col && partes[col] == null) { partes[col] = s; return; }
        if (!col && i.x >= 150 && i.x < 400) { descricao.push(i); return; }
      } else {
        if (i.x >= 420 && i.x < 460) { partes.unidade = s; return; }
        if (i.x >= 150 && i.x < 400) { descricao.push(i); return; }
      }
      estranhos.push(i);
    });
    descricao.sort(function (a, c) { return a.y - c.y || a.x - c.x; });
    return {
      partes: partes, estranhos: estranhos, indices: indices, pesos: pesos,
      descricao: descricao.map(function (d) { return d.s.trim(); }).join(' ').replace(/\s+/g, ' '),
      fornecedor: fornecedor.map(function (d) { return d.s.trim(); }).join(' ').replace(/\s+/g, ' '),
      subtipo: subtipo.join(' ')
    };
  }

  function lerProdutos(itensBrutos) {
    var m = miolo(itensBrutos, 'Grupo');
    var blocos = [], atual = null, naoReconhecidos = [];
    m.itens.forEach(function (i) {
      var s = i.s.trim();
      if (i.x < 45 && /^\d{3}$/.test(s)) { atual = { grupo: s, pagina: i.p, y: i.y, itens: [] }; blocos.push(atual); return; }
      if (!atual) { naoReconhecidos.push(i); return; }
      atual.itens.push(i);
    });

    var produtos = blocos.map(function (b) {
      var mp = montarProduto(b), p = mp.partes, avisos = [], erros = [];
      mp.estranhos.forEach(function (i) { naoReconhecidos.push(i); });
      var descOriginal = mp.descricao;
      var qtd = decimalBR(p.qtd || '0') || 0;
      var preco = centavosBR(p.preco || '0') || 0;
      var custo = centavosBR(p.custo || '0') || 0;
      var indice = mp.indices.length ? decimalBR(mp.indices[mp.indices.length - 1].s.trim()) : 0;
      var peso = mp.pesos.length ? decimalBR(mp.pesos[mp.pesos.length - 1].s.trim()) : 0;
      var minimo = decimalBR(p.minimo || '0') || 0;
      var cat = categoria(descOriginal);
      if (mp.indices.length > 1 || mp.pesos.length > 1) prob(erros, 'leitura-ambigua', 'mais de um índice/peso no mesmo produto: conferir no relatório (página ' + b.pagina + ')');
      if (!descOriginal) prob(erros, 'sem-descricao', 'sem descrição');
      if (b.codigo == null) prob(erros, 'sem-codigo', 'sem código');
      if (!preco && indice > 0) prob(avisos, 'preco-por-indice', 'preço por índice (sem preço fixo)');
      else if (!preco) prob(avisos, 'sem-preco', 'sem preço de venda e sem índice');
      if (!custo) prob(avisos, 'sem-custo', 'sem custo cadastrado');
      if (qtd <= 0) prob(avisos, 'sem-estoque', 'sem estoque');
      else if (qtd % 1 !== 0) prob(avisos, 'qtd-fracionada', 'quantidade fracionada (' + String(qtd).replace('.', ',') + ')');
      var pd = pesoNaDescricao(descOriginal);
      if (pd != null && peso && Math.abs(pd - peso) > 0.05) prob(avisos, 'peso-divergente', 'peso na descrição (' + String(pd).replace('.', ',') + ' g) diferente do campo peso (' + String(peso).replace('.', ',') + ' g)');
      if (/^(COMPRAS?|DIVERSOS|AVULSO|TESTE)$/i.test(descOriginal)) prob(avisos, 'nao-produto', 'não parece um produto ("' + descOriginal + '")');
      return {
        codigo: b.codigo, grupo: b.grupo, sub: b.sub || '', pagina: b.pagina,
        descricao: titulo(descOriginal), descricaoOriginal: descOriginal,
        quantidade: qtd, unidade: (p.unidade || 'UN').toUpperCase(), custoCentavos: custo, valorEstoqueCentavos: centavosBR(p.valorEstoque || '0') || 0,
        aliquota: p.aliquota || '', precoCentavos: preco, minimo: minimo, indice: indice, peso: peso,
        marca: p.marca && p.marca !== 'MARCAS' ? titulo(p.marca) : '', fornecedor: mp.fornecedor ? titulo(mp.fornecedor) : '', subtipo: mp.subtipo,
        categoria: cat ? cat.categoria : null, segmento: cat ? cat.segmento : null, ilustracao: cat ? cat.ilustracao : null,
        metal: metal(descOriginal), pedras: pedras(descOriginal), medidas: medidasArmacao(descOriginal),
        avisos: avisos, erros: erros
      };
    });

    // Produto sem palavra-chave herda a categoria mais comum do seu grupo no G-Ótica.
    var votos = {};
    produtos.forEach(function (p) { if (!p.categoria) return; var v = votos[p.grupo] = votos[p.grupo] || {}; var k = p.categoria + '|' + p.segmento + '|' + p.ilustracao; v[k] = (v[k] || 0) + 1; });
    produtos.forEach(function (p) {
      if (p.categoria) return;
      var v = votos[p.grupo];
      if (v) {
        var k = Object.keys(v).sort(function (a, b) { return v[b] - v[a]; })[0].split('|');
        p.categoria = k[0]; p.segmento = k[1]; p.ilustracao = k[2];
        prob(p.avisos, 'categoria-deduzida', 'categoria deduzida pelo grupo ' + p.grupo + ' (' + k[0] + ')');
      } else {
        p.categoria = 'Outros'; p.segmento = 'joia'; p.ilustracao = 'servico';
        prob(p.avisos, 'sem-categoria', 'categoria não identificada');
      }
    });
    marcarDuplicados(produtos, function (p) { return 'cod:' + p.codigo; }, 'mesmo código de');

    return { tipo: 'produtos', registros: produtos, naoReconhecidos: naoReconhecidos, conferencia: conferirProdutos(produtos, m.totais) };
  }

  /* Confere o que foi lido com os totais impressos no fim do relatório. */
  function conferirProdutos(produtos, totais) {
    var linha = totais.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    function apos(rotulo, n) {
      var r = linha.filter(function (t) { return t.s.indexOf(rotulo) >= 0; })[0];
      if (!r) return null;
      var dentro = r.s.slice(r.s.indexOf(rotulo) + rotulo.length).replace(/^\s*:?\s*/, '').trim();
      if (dentro && ehNumero(dentro) && !n) return dentro;
      var nums = linha.filter(function (t) { return ehNumero(t.s.trim()) && Math.abs(t.y - r.y) <= 3 && t.x > r.x; }).sort(function (a, b) { return a.x - b.x; });
      return nums[n || 0] ? nums[n || 0].s.trim() : null;
    }
    var soma = function (f) { return produtos.reduce(function (s, p) { return s + f(p); }, 0); };
    var val = function (s, f) { return s == null ? null : f(s); };
    var declarado = {
      itens: val(apos('Total Itens Listados:'), decimalBR),
      quantidade: val(apos('Quant.Total:'), decimalBR),
      valorEstoque: val(apos('Valor Total:'), centavosBR),
      valorVenda: val(apos('Valor Total:', 1), centavosBR),
      indice: val(apos('Índice Total'), decimalBR),
      peso: val(apos('Peso Total'), decimalBR)
    };
    // Valores somam preço × quantidade; índice e peso o relatório soma por linha.
    var lido = {
      itens: produtos.length,
      quantidade: Math.round(soma(function (p) { return p.quantidade; }) * 100) / 100,
      valorEstoque: soma(function (p) { return p.valorEstoqueCentavos; }),
      valorVenda: soma(function (p) { return Math.round(p.precoCentavos * p.quantidade); }),
      indice: Math.round(soma(function (p) { return p.indice; }) * 1000) / 1000,
      peso: Math.round(soma(function (p) { return p.peso; }) * 1000) / 1000
    };
    var confere = {};
    Object.keys(declarado).forEach(function (k) {
      if (declarado[k] == null) { confere[k] = null; return; }
      var tol = k === 'indice' || k === 'peso' ? 0.0015 : k === 'quantidade' ? 0.005 : 0;
      confere[k] = Math.abs(declarado[k] - lido[k]) <= tol;
    });
    return { declarado: declarado, lido: lido, confere: confere };
  }

  /* ------------------------------ resumo para a prévia ------------------------------ */
  /* opcoes.ignorar: chaves que não contam para "com aviso" (ex.: sem custo, quando o relatório
     inteiro não traz custo). Continuam na lista de problemas. */
  function resumir(resultado, opcoes) {
    var ignorar = (opcoes && opcoes.ignorar) || {};
    var porProblema = {}, comErro = 0, comAviso = 0;
    resultado.registros.forEach(function (r) {
      if (r.erros.length) comErro++; else if (r.avisos.some(function (a) { return !ignorar[a.c]; })) comAviso++;
      r.erros.map(function (a) { return [a, true]; }).concat(r.avisos.map(function (a) { return [a, false]; })).forEach(function (par) {
        var a = par[0];
        var g = porProblema[a.c] = porProblema[a.c] || { chave: a.c, grave: par[1], quantos: 0, exemplos: [] };
        g.quantos++;
        if (g.exemplos.length < 6) g.exemplos.push({ codigo: r.codigo, nome: r.nome || r.descricao, detalhe: a.t });
      });
    });
    return {
      total: resultado.registros.length, comErro: comErro, comAviso: comAviso,
      limpos: resultado.registros.length - comErro - comAviso,
      problemas: Object.keys(porProblema).map(function (k) { return porProblema[k]; }).sort(function (a, b) { return (b.grave - a.grave) || (b.quantos - a.quantos); })
    };
  }

  /* ------------------------------ para o sistema ------------------------------ */
  function num(n, casas) { return String(Number(n.toFixed(casas))).replace('.', ','); }
  // Problemas que valem para quase tudo e só poluiriam cada ficha: vão para o painel da migração.
  var GERAIS = { 'sem-custo': 1, 'preco-por-indice': 1, 'categoria-deduzida': 1 };

  function paraCliente(r) {
    var probs = r.erros.concat(r.avisos);
    var revisar = r.erros.length > 0 || r.avisos.some(function (a) { return a.c === 'duplicado' || a.c === 'sem-ddd' || a.c === 'campos-suspeitos'; });
    return {
      id: 'g' + r.codigo, codigoAntigo: r.codigo || '', nome: r.nome || 'Cliente ' + r.codigo,
      telefone: r.telefoneValido ? r.telefone : '', telefoneOriginal: r.telefoneValido ? '' : r.telefone,
      email: '', nascimento: r.nascimento, desde: null, endereco: r.endereco, cidade: r.cidade,
      documento: r.documento.digitos ? { tipo: r.documento.tipo, digitos: r.documento.digitos, valido: r.documento.valido } : null,
      pessoa: r.pessoa, interesses: [], tags: revisar ? ['Revisar'] : [], notas: '',
      importacao: probs.map(function (a) { return a.t; })
    };
  }

  function paraProduto(r) {
    var at = {};
    if (r.metal) at.Metal = r.metal;
    if (r.peso) at.Peso = num(r.peso, 3) + ' g';
    if (r.indice) at['Índice'] = num(r.indice, 3);
    if (r.pedras) at.Pedras = r.pedras;
    if (r.medidas) at.Medidas = r.medidas;
    if (r.marca) at.Marca = r.marca;
    if (r.fornecedor) at.Fornecedor = r.fornecedor;
    at['Código no G-Ótica'] = r.codigo + ' · grupo ' + r.grupo;
    var probs = r.erros.concat(r.avisos).filter(function (a) { return !GERAIS[a.c]; });
    return {
      id: 'gp' + r.codigo, codigoAntigo: r.codigo || '', nome: r.descricao, segmento: r.segmento, categoria: r.categoria, sku: 'GO-' + (r.codigo || '?'),
      precoCentavos: r.precoCentavos, precoPorIndice: !r.precoCentavos && r.indice > 0, indice: r.indice, peso: r.peso,
      custoCentavos: r.custoCentavos, estoque: r.quantidade, minimo: r.minimo, unidade: r.unidade,
      ilustracao: r.ilustracao, laboratorio: r.categoria === 'Lentes', gera: r.categoria === 'Lentes' ? 'otica' : null,
      atributos: at, importacao: probs.map(function (a) { return a.t; }), revisar: r.erros.length > 0 || probs.length > 0
    };
  }

  /* Ids únicos: código repetido no relatório vira "g250-2"; peça sem código ganha id pela posição. */
  function idsUnicos(lista, prefixo) {
    var vistos = {};
    lista.forEach(function (r, n) {
      var id = r.codigoAntigo ? prefixo + r.codigoAntigo : prefixo + '-sem-codigo-' + (n + 1);
      var final = id, k = 2;
      while (vistos[final]) final = id + '-' + k++;
      vistos[final] = 1;
      r.id = final;
    });
    return lista;
  }
  /* Ids usados por vendas, orçamentos, pedidos, parcelas e agenda: esses cadastros nunca somem. */
  function referenciados(d) {
    var ids = {};
    (d.vendas || []).concat(d.orcamentos || []).forEach(function (v) { ids[v.clienteId] = 1; (v.itens || []).forEach(function (i) { ids[i.produtoId] = 1; }); });
    (d.pedidos || []).concat(d.financeiro || [], d.agenda || []).forEach(function (x) { if (x.clienteId) ids[x.clienteId] = 1; });
    return ids;
  }

  /* Monta a base nova a partir da atual.
     - Vindo dos exemplos: troca os cadastros e zera as movimentações de exemplo (vendas, pedidos,
       agenda), que apontavam para clientes e produtos fictícios.
     - Importando de novo: atualiza pelo código do G-Ótica e MANTÉM tudo o que a loja fez no Lapidar
       (vendas, pedidos, parcelas, caixa, numeração), os cadastros criados aqui e qualquer cadastro
       usado por uma movimentação. */
  /* exemplo: a base de exemplo (DadosDemo), para saber quais cadastros são fictícios. */
  function montarDados(base, resClientes, resProdutos, quando, exemplo) {
    var d = JSON.parse(JSON.stringify(base));
    var real = base.origem === 'importado', ant = base.importacao || {};
    var usados = real ? referenciados(base) : {};
    function idsDe(lista) { var m = {}; (lista || []).forEach(function (x) { m[x.id] = x; }); return m; }
    function trocar(antigos, novos, prefixo, fict) {
      var novosIds = idsDe(novos), velhos = idsDe(antigos);
      // Preço definido no Lapidar para peça que o G-Ótica traz sem preço não se perde.
      novos.forEach(function (n) { var v = velhos[n.id]; if (v && v.precoLocal && !n.precoCentavos) { n.precoCentavos = v.precoCentavos; n.precoLocal = true; } });
      var mantidos = (antigos || []).filter(function (a) {
        if (novosIds[a.id]) return false;
        if (usados[a.id]) return true;
        // Base de exemplo: sai tudo. Base real: fica o que foi criado no Lapidar
        // (nem de importação anterior, nem fictício).
        return real && String(a.id).indexOf(prefixo) !== 0 && !fict[a.id];
      });
      return novos.concat(mantidos);
    }
    var ex = exemplo || {};
    if (resClientes) d.clientes = trocar(d.clientes, idsUnicos(resClientes.registros.map(paraCliente), 'g'), 'g', idsDe(ex.clientes));
    if (resProdutos) d.produtos = trocar(d.produtos, idsUnicos(resProdutos.registros.map(paraProduto), 'gp'), 'gp', idsDe(ex.produtos));
    if (!real) {
      d.vendas = []; d.orcamentos = []; d.pedidos = []; d.financeiro = []; d.agenda = [];
      d.caixa = { aberto: true, fundo: 0, movimentos: [], fechado: null, dia: quando };
      d.proximoNumero = { venda: 1, pedido: 1, orcamento: 1 };
    }
    d.origem = 'importado';
    d.config = d.config || {};
    d.importacao = {
      quando: quando,
      clientes: resClientes ? { total: resClientes.registros.length, conferencia: resClientes.conferencia, resumo: semExemplos(resumir(resClientes)) } : ant.clientes || null,
      produtos: resProdutos ? { total: resProdutos.registros.length, conferencia: resProdutos.conferencia, resumo: semExemplos(resumir(resProdutos)) } : ant.produtos || null
    };
    return d;
  }
  function semExemplos(r) {
    return { total: r.total, limpos: r.limpos, comAviso: r.comAviso, comErro: r.comErro, problemas: r.problemas.map(function (p) { return { chave: p.chave, grave: p.grave, quantos: p.quantos }; }) };
  }

  /* Planilha para a loja corrigir o cadastro na origem: um problema por linha. */
  function planilhaPendencias(resClientes, resProdutos) {
    var linhas = [['Cadastro', 'Código', 'Nome ou descrição', 'Gravidade', 'Problema']];
    [[resClientes, 'Cliente'], [resProdutos, 'Produto']].forEach(function (par) {
      if (!par[0]) return;
      par[0].registros.forEach(function (r) {
        r.erros.forEach(function (a) { linhas.push([par[1], r.codigo, r.nome || r.descricaoOriginal, 'Corrigir', a.t]); });
        r.avisos.forEach(function (a) { if (!GERAIS[a.c]) linhas.push([par[1], r.codigo, r.nome || r.descricaoOriginal, 'Conferir', a.t]); });
      });
    });
    return linhas;
  }

  function ler(itens, opcoes) {
    var tipo = detectar(itens);
    if (tipo === 'clientes') return lerClientes(itens, opcoes);
    if (tipo === 'produtos') return lerProdutos(itens, opcoes);
    return null;
  }

  return {
    ler: ler, detectar: detectar, lerClientes: lerClientes, lerProdutos: lerProdutos, resumir: resumir,
    paraCliente: paraCliente, paraProduto: paraProduto, montarDados: montarDados, planilhaPendencias: planilhaPendencias,
    decimalBR: decimalBR, centavosBR: centavosBR, titulo: titulo, cidade: cidade, telefone: telefone,
    documento: documento, cpfValido: cpfValido, cnpjValido: cnpjValido, mascararDocumento: mascararDocumento,
    dataBR: dataBR, categoria: categoria, metal: metal, pedras: pedras, medidasArmacao: medidasArmacao, pesoNaDescricao: pesoNaDescricao
  };
});
