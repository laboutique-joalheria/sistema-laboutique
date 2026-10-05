'use strict';
/* Relatórios SINTÉTICOS no formato do G-Ótica (HPR Sistemas / QuickReports).
   Nomes, documentos e telefones são inventados. Servem para os testes de regra (como itens,
   do jeito que o pdf.js entrega) e para o teste no navegador (como PDF de verdade). */

// Um pedaço de texto: página, x, y a partir do topo, largura, texto.
const it = (p, x, y, w, s) => ({ p, x, y, w, s });

function cabecalhoClientes(p) {
  return [it(p, 33, 46, 300, 'LA BOUTIQUE JOALHERIA E OPTICA LTDA'), it(p, 611, 45, 154, 'CADASTRO DE CLIENTES'), it(p, 31, 61, 73, 'Cidade: TODAS'),
    it(p, 66, 78, 28, 'Nome'), it(p, 360, 78, 34, 'Cidade'), it(p, 31, 78, 35, 'Código'), it(p, 220, 78, 46, 'Endereço'), it(p, 458, 78, 24, 'Fone'),
    it(p, 608, 78, 61, 'Mensalidade'), it(p, 705, 78, 41, 'Dt.Nasc.'), it(p, 524, 78, 50, 'CPF/CNPJ')];
}
const rodape = (p, y) => [it(p, 33, y, 94, 'G-Ótica - HPR Sistemas'), it(p, 589, y + 2, 85, '02/10/2026 15:16:32'), it(p, 696, y + 2, 34, 'Página:'), it(p, 730, y + 2, 5, String(p))];

function cabecalhoProdutos(p) {
  return [it(p, 33, 43, 300, 'LA BOUTIQUE JOALHERIA E OPTICA LTDA'), it(p, 569, 44, 238, 'RELATÓRIO DE POSIÇÃO DO ESTOQUE'), it(p, 34, 55, 77, 'Grupo: TODOS -'),
    it(p, 30, 69, 31, 'Grupo'), it(p, 163, 69, 49, 'Descrição'), it(p, 376, 69, 22, 'QTD'), it(p, 84, 69, 35, 'Código'), it(p, 471, 69, 103, 'Custo Médio Estoque'),
    it(p, 631, 69, 91, 'PREÇO R$Est. Mín'), it(p, 602, 69, 22, 'Aliq.'), it(p, 60, 69, 19, 'Sub'), it(p, 444, 69, 22, 'Tipo'), it(p, 729, 69, 30, 'Índice'), it(p, 769, 69, 28, 'PESO')];
}
// Bloco de quantidade/valores de um produto, na altura y (números alinhados à direita, como no relatório).
const valores = (p, y, { qtd = '1', un = 'UN', custo = '0,00', estoque = '0,00', preco = '0,00', min = '0' } = {}) => [
  it(p, 421 - 5.7 * qtd.length, y, 5.7 * qtd.length, qtd), it(p, 425, y, 15, un), it(p, 531 - 19.9, y, 19.9, custo), it(p, 594 - 19.9, y, 19.9, estoque),
  it(p, 602, y, 5.7, '1'), it(p, 671 - 6 * preco.length, y, 6 * preco.length, preco), it(p, 671, y, 8, '**'), it(p, 683, y, 5.7, min)];
const par = (p, y, indice, peso) => [it(p, 731, y, 6 * indice.length, indice), it(p, 796 - 5 * peso.length, y, 5 * peso.length, peso)];

/* Larguras Helvetica (por 1000 em), o bastante para os textos destes relatórios. */
const HELV = { ' ': 278, '.': 278, ',': 278, '-': 333, '/': 278, ':': 278, '*': 389, '(': 333, ')': 333, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611 };
const CORPO = 8.2; // tamanho da letra no relatório real
const largura = (s, corpo = CORPO) => [...s].reduce((t, ch) => { const b = ch.normalize('NFD')[0]; return t + (/\d/.test(b) ? 556 : HELV[b] || (/[a-z]/.test(b) ? 520 : 556)); }, 0) * corpo / 1000;

/* Cadastro de clientes com os casos que pedem atenção. O cliente 905 tem nome e endereço
   encostados: no PDF são dois textos, e o pdf.js entrega um pedaço só. */
function relatorioClientes() {
  const nome = 'ANDREIA EXEMPLO DE SOUZA SANTOS', end = 'RUA DAS ACACIAS';
  const xNome = 220 - largura(nome);
  return [
    ...cabecalhoClientes(1),
    it(1, 30, 91, 13, '250'), it(1, 63, 91, 117, 'MARIA DA SILVA TESTE'), it(1, 220, 91, 98, 'RUA DAS FLORES'), it(1, 360, 92, 14, 'IJUI'),
    it(1, 702, 92, 41, '12/03/1990'), it(1, 459, 91, 52, '055 99000101'), it(1, 608, 91, 16, '0,00'), it(1, 530, 92, 57, '529.982.247-25'),
    it(1, 30, 101, 9, '52'), it(1, 63, 101, 134, 'JOAO SEM DOCUMENTO'), it(1, 360, 102, 14, 'IJUI'), it(1, 459, 101, 50, '55990001020'),
    it(1, 608, 101, 16, '0,00'), it(1, 534.6, 103, 2, '.'), it(1, 543.7, 103, 2, '.'), it(1, 552.8, 103, 2, '/'), it(1, 564.2, 103, 2, '-'),
    it(1, 30, 112, 13, '487'), it(1, 63, 112, 92, 'OUTRA PESSOA'), it(1, 220, 112, 20, 'RUA'), it(1, 360, 113, 14, 'IJUI'),
    it(1, 702, 113, 41, '31/02/1980'), it(1, 459, 112, 30, '12345'), it(1, 608, 112, 16, '0,00'), it(1, 530, 113, 57, '529.982.247-25'),
    it(1, 30, 122, 13, '434'), it(1, 63, 122, 31, 'EMPRESA EXEMPLO'), it(1, 360, 123, 14, 'IJUI'), it(1, 459, 122, 50, '5533331234'),
    it(1, 608, 122, 16, '0,00'), it(1, 530, 124, 73, '11.222.333/0001-81'),
    it(1, 30, 133, 13, '905'), it(1, xNome, 133, largura(nome), nome), it(1, 220, 133, largura(end), end), it(1, 360, 134, 14, 'IJUI'),
    it(1, 459, 133, 50, '55991234567'), it(1, 608, 133, 16, '0,00'), it(1, 702, 134, 41, '15/03/1985'),
    it(1, 143, 150, 20, '5'), it(1, 31, 150, 91, 'Total Clientes Listados:'), it(1, 591, 150, 30, 'Total:'), it(1, 651, 150, 16, '0,00'),
    ...rodape(1, 578)
  ];
}

/* Posição do estoque com as armadilhas do layout real: par índice/peso desenhado na altura
   do produto seguinte, descrição em pedaços, peso 1 ponto acima do rodapé e totais impressos. */
function relatorioProdutos() {
  return [
    ...cabecalhoProdutos(1),
    it(1, 31, 100, 17, '013'), it(1, 85, 100, 11, '61'), it(1, 163, 99, 146, 'PING 750 PIMENTA VERMELHA'), ...valores(1, 100), it(1, 61, 100, 11, '00'),
    ...par(1, 116, '1,098', '0,45'), it(1, 731, 100, 44, 'MARCAS'),
    it(1, 31, 117, 17, '013'), it(1, 85, 117, 11, '66'), it(1, 163, 116, 186, 'PING 750 CAO LULU 1,18G'), ...valores(1, 117), it(1, 61, 117, 11, '00'),
    ...par(1, 133, '3,258', '1,18'), it(1, 731, 117, 44, 'MARCAS'),
    it(1, 31, 150, 17, '049'), it(1, 85, 150, 23, '1231'), it(1, 163, 149, 93, 'OCULOS REC. VOCH'), it(1, 263.4, 149, 20.5, '8112'), it(1, 291.7, 149, 70, '47*16-130 C243'),
    ...valores(1, 166, { custo: '120,00', estoque: '120,00', preco: '218,00' }), it(1, 61, 150, 11, '00'),
    it(1, 160, 164, 60, 'Fornecedor:'), it(1, 39, 165, 44, 'SubTipo:'), it(1, 214, 164, 36, 'PROVOQ'), ...par(1, 166, '0', '0'), it(1, 731, 150, 44, 'MARCAS'),
    it(1, 31, 545, 17, '015'), it(1, 85, 545, 23, '2114'), it(1, 163, 544, 200, 'BRINCO 416 P: 1,99 ARGOLA'), ...valores(1, 545, { un: 'Par' }), it(1, 61, 545, 11, '00'),
    ...par(1, 561, '3,688', '1,99'), it(1, 731, 545, 44, 'MARCAS'),
    ...rodape(1, 562),
    ...cabecalhoProdutos(2),
    it(2, 31, 86, 17, '003'), it(2, 85, 86, 6, '7'), it(2, 163, 85, 47, 'COMPRAS'), ...valores(2, 86, { qtd: '0,01' }), it(2, 61, 86, 11, '00'), ...par(2, 102, '0', '0'), it(2, 731, 86, 44, 'MARCAS'),
    it(2, 31, 133, 17, '002'), it(2, 85, 133, 6, '1'), it(2, 163, 132, 300, 'AENL 750 P; 4,37G BRILHANTE PEROLA'), it(2, 61, 133, 11, '00'), it(2, 731, 133, 44, 'MARCAS'),
    it(2, 160, 147, 60, 'Fornecedor:'), it(2, 214, 147, 56, 'OURIVES EXEMPLO'), it(2, 39, 148, 44, 'SubTipo:'), ...valores(2, 149), ...par(2, 149, '21,188', '5,56'),
    it(2, 143, 286, 20, '6'), it(2, 31, 286, 92, 'Total Itens Listados:'), it(2, 471, 286, 52, 'Valor Total:'), it(2, 540.5, 286, 40, '120,00'), it(2, 603, 286, 51, '218,00'),
    it(2, 255, 286, 56, 'Quant.Total:'), it(2, 328.5, 286, 40, '5,01'), it(2, 725, 286, 107, 'Índice Total: 29,232'), it(2, 725, 298, 103, 'Peso Total : 9,18'),
    ...rodape(2, 562)
  ];
}

/* Gera um PDF (A4 deitado, Helvetica) com os pedaços nas mesmas posições. Números da área de
   valores (x ≥ 300) ficam alinhados pela direita, como o QuickReports imprime; o resto, pela esquerda.
   Tudo num único bloco de texto por página, para o pdf.js juntar vizinhos como faz no relatório real.
   No relatório real, "**" e a unidade (UN, Par) vêm em outra fonte e por isso não grudam no número
   vizinho: aqui também (fonte F2). */
function pdfDe(itens) {
  const L = 842, A = 595;
  const paginas = [...new Set(itens.map(i => i.p))].sort((a, b) => a - b);
  const esc = s => s.replace(/[\\()]/g, m => '\\' + m);
  const numero = s => /^-?[\d.]*\d(,\d+)?$/.test(s.trim());
  const objs = [];
  const add = corpo => { objs.push(corpo); return objs.length; };
  const catalogo = add(null), raiz = add(null);
  const fonte = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fonte2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const outraFonte = i => i.s === '**' || (i.x >= 420 && i.x < 460 && !numero(i.s));
  const kids = paginas.map(p => {
    let atual = 'F1';
    const linhas = itens.filter(i => i.p === p).map(i => {
      const x = numero(i.s) && i.x >= 300 ? i.x + i.w - largura(i.s) : i.x;
      const f = outraFonte(i) ? 'F2' : 'F1', troca = f !== atual ? `/${f} ${CORPO} Tf ` : '';
      atual = f;
      return `${troca}1 0 0 1 ${x.toFixed(2)} ${(A - i.y).toFixed(2)} Tm (${esc(i.s)}) Tj`;
    });
    const fluxo = Buffer.from(`BT /F1 ${CORPO} Tf\n${linhas.join('\n')}\nET`, 'latin1');
    const conteudo = add({ fluxo });
    return add(`<< /Type /Page /Parent ${raiz} 0 R /MediaBox [0 0 ${L} ${A}] /Resources << /Font << /F1 ${fonte} 0 R /F2 ${fonte2} 0 R >> >> /Contents ${conteudo} 0 R >>`);
  });
  objs[catalogo - 1] = `<< /Type /Catalog /Pages ${raiz} 0 R >>`;
  objs[raiz - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const partes = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  const offsets = [];
  let tam = partes[0].length;
  objs.forEach((o, n) => {
    offsets.push(tam);
    const corpo = o.fluxo
      ? Buffer.concat([Buffer.from(`${n + 1} 0 obj\n<< /Length ${o.fluxo.length} >>\nstream\n`, 'latin1'), o.fluxo, Buffer.from('\nendstream\nendobj\n', 'latin1')])
      : Buffer.from(`${n + 1} 0 obj\n${o}\nendobj\n`, 'latin1');
    partes.push(corpo); tam += corpo.length;
  });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') +
    `trailer\n<< /Size ${objs.length + 1} /Root ${catalogo} 0 R >>\nstartxref\n${tam}\n%%EOF\n`;
  partes.push(Buffer.from(xref, 'latin1'));
  return Buffer.concat(partes);
}

module.exports = { it, cabecalhoClientes, rodape, cabecalhoProdutos, valores, par, largura, relatorioClientes, relatorioProdutos, pdfDe };
