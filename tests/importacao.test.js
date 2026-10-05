'use strict';
/* Importação dos relatórios do G-Ótica. Os dados aqui são SINTÉTICOS, montados no mesmo
   formato que o pdf.js entrega (texto + posição + ordem de desenho). Nenhum dado real de cliente
   entra no repositório. */
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../js/regras/importacao.js');

const { it, cabecalhoClientes, rodape, cabecalhoProdutos, valores, par, relatorioClientes, relatorioProdutos } = require('./fixtures/g-otica.js');

test('clientes: lê linhas, valida documento, telefone e data, e confere com o total impresso', () => {
  const itens = [
    ...cabecalhoClientes(1),
    it(1, 30, 91, 13, '250'), it(1, 63, 91, 117, 'MARIA DA SILVA TESTE'), it(1, 220, 91, 98, 'RUA DAS FLORES'), it(1, 360, 92, 14, 'IJUI'),
    it(1, 702, 92, 41, '12/03/1990'), it(1, 459, 91, 52, '055 99000101'), it(1, 608, 91, 16, '0,00'), it(1, 530, 92, 57, '529.982.247-25'),
    // CPF vazio sai picado em pedaços ". . / -"
    it(1, 30, 101, 9, '52'), it(1, 63, 101, 134, 'JOAO SEM DOCUMENTO'), it(1, 360, 102, 14, 'IJUI'), it(1, 459, 101, 50, '55990001020'),
    it(1, 608, 101, 16, '0,00'), it(1, 534.6, 103, 2, '.'), it(1, 543.7, 103, 2, '.'), it(1, 552.8, 103, 2, '/'), it(1, 564.2, 103, 2, '-'),
    // mesmo CPF da Maria, data impossível e telefone curto
    it(1, 30, 112, 13, '487'), it(1, 63, 112, 92, 'OUTRA PESSOA'), it(1, 220, 112, 20, 'RUA'), it(1, 360, 113, 14, 'IJUI'),
    it(1, 702, 113, 41, '31/02/1980'), it(1, 459, 112, 30, '12345'), it(1, 608, 112, 16, '0,00'), it(1, 530, 113, 57, '529.982.247-25'),
    // empresa com CNPJ
    it(1, 30, 122, 13, '434'), it(1, 63, 122, 31, 'EMPRESA EXEMPLO'), it(1, 360, 123, 14, 'IJUI'), it(1, 459, 122, 50, '5533331234'),
    it(1, 608, 122, 16, '0,00'), it(1, 530, 124, 73, '11.222.333/0001-81'),
    it(1, 143, 140, 20, '4'), it(1, 31, 140, 91, 'Total Clientes Listados:'), it(1, 591, 140, 30, 'Total:'), it(1, 651, 140, 16, '0,00'),
    ...rodape(1, 578)
  ];
  assert.equal(I.detectar(itens), 'clientes');
  const r = I.ler(itens, { anoAtual: 2026 });
  assert.equal(r.registros.length, 4);
  assert.deepEqual(r.conferencia, { declarado: 4, lido: 4, confere: true });
  assert.equal(r.naoReconhecidos.length, 0);
  const [maria, joao, outra, empresa] = r.registros;
  assert.equal(maria.nome, 'Maria da Silva Teste');
  assert.equal(maria.cidade, 'Ijuí');
  assert.equal(maria.telefone, '(55) 99900-0101'); // 8 dígitos antigos + DDD com zero
  assert.equal(maria.nascimento, '1990-03-12');
  assert.equal(maria.documento.valido, true);
  assert.equal(I.mascararDocumento(maria.documento), '***.982.247-**');
  assert.ok(maria.avisos.some(a => a.c === 'celular-8-digitos'));
  assert.equal(joao.documento.digitos, '');
  assert.ok(joao.avisos.some(a => a.c === 'sem-documento'));
  assert.ok(joao.avisos.some(a => a.c === 'sem-nascimento'));
  assert.ok(outra.erros.some(a => a.c === 'nascimento-invalido'));
  assert.ok(outra.erros.some(a => a.c === 'telefone-invalido'));
  assert.ok(outra.avisos.some(a => a.c === 'endereco-incompleto'));
  assert.ok(outra.avisos.some(a => a.c === 'duplicado' && /Maria/.test(a.t)));
  assert.equal(empresa.pessoa, 'juridica');
  assert.equal(empresa.documento.valido, true);
  assert.equal(empresa.telefone, '(55) 3333-1234'); // fixo de 8 dígitos fica como está
  const res = I.resumir(r);
  assert.equal(res.total, 4);
  assert.equal(res.problemas[0].grave, true); // erros vêm antes dos avisos
});

// Larguras Helvetica (por 1000 em) das letras usadas abaixo, para simular onde o PDF desenha cada texto.
const HELV = { ' ': 278, A: 667, D: 722, E: 667, F: 611, I: 278, L: 556, M: 833, O: 778, P: 667, R: 722, S: 667, T: 611, U: 722, V: 667, N: 722, B: 667, C: 722, G: 778, Z: 611 };
const larg = (s, k) => [...s].reduce((t, ch) => t + (/\d/.test(ch) ? 556 : HELV[ch]), 0) * k;

test('clientes: separa textos que o pdf.js grudou (nome+endereço, cidade+fone), mas não corta nome comprido', () => {
  const k = 0.0091; // ≈ corpo 9,1 pt, como no relatório
  // Ajusta o corpo da letra para que a primeira parte termine exatamente no início da coluna seguinte.
  const colado = (p, y, x, inicio, a, b) => { const kk = (inicio - x) / larg(a, 1); return it(p, x, y, larg(a + b, kk), a + b); };
  const itens = [
    ...cabecalhoClientes(1),
    it(1, 30, 91, 13, '901'), colado(1, 91, 63, 220, 'MARIA TESTE DA SILVA', 'RUA DAS FLORES'), it(1, 360, 92, 14, 'IJUI'),
    it(1, 459, 91, 52, '55991234567'), it(1, 608, 91, 16, '0,00'),
    it(1, 30, 101, 13, '902'), it(1, 63, 101, 60, 'BIA TESTE'), colado(1, 101, 360, 459, 'PALMEIRA DAS MISSOES', '055991234568'), it(1, 608, 101, 16, '0,00'),
    // nome comprido que invade a coluna vazia do endereço só com a última letra: fica inteiro
    it(1, 30, 112, 13, '903'), it(1, 63, 112, larg('ROSANA TESTE DE MOURA SANTOS', k) + 4, 'ROSANA TESTE DE MOURA SANTOS'), it(1, 360, 113, 14, 'IJUI'),
    it(1, 459, 112, 52, '55991234569'), it(1, 608, 112, 16, '0,00'),
    // nome comprido sobre um endereço que existe: também fica inteiro
    it(1, 30, 122, 13, '904'), colado(1, 122, 63, 220, 'FERNANDA TESTE DE SOUZA', ' LEMOS'), it(1, 220, 122, 40, 'RUA B'),
    it(1, 360, 123, 14, 'IJUI'), it(1, 459, 122, 52, '55991234560'), it(1, 608, 122, 16, '0,00'),
    it(1, 143, 140, 20, '4'), it(1, 31, 140, 91, 'Total Clientes Listados:'),
    ...rodape(1, 578)
  ];
  const r = I.lerClientes(itens, { anoAtual: 2026 });
  const [a, b, c, d] = r.registros;
  assert.equal(a.nome, 'Maria Teste da Silva');
  assert.equal(a.endereco, 'Rua das Flores');
  assert.ok(a.avisos.some(x => x.c === 'campos-separados'));
  assert.equal(b.cidade, 'Palmeira das Missões');
  assert.equal(b.telefone, '(55) 99123-4568');
  assert.equal(c.nome, 'Rosana Teste de Moura Santos');
  assert.equal(c.endereco, '');
  assert.ok(!c.avisos.some(x => x.c === 'campos-separados'));
  assert.equal(d.nome, 'Fernanda Teste de Souza Lemos');
  assert.equal(d.endereco, 'Rua B');
});

test('produtos: cada número fica no produto certo pela ordem de desenho, mesmo quando cai na altura do vizinho', () => {
  const itens = relatorioProdutos();
  assert.equal(I.detectar(itens), 'produtos');
  const r = I.ler(itens);
  assert.equal(r.naoReconhecidos.length, 0, JSON.stringify(r.naoReconhecidos));
  const [a, b, c, d, e, f] = r.registros;
  assert.deepEqual([a.indice, a.peso], [1.098, 0.45]);
  assert.deepEqual([b.indice, b.peso], [3.258, 1.18]);
  assert.equal(c.descricaoOriginal, 'OCULOS REC. VOCH 8112 47*16-130 C243');
  assert.equal(c.fornecedor, 'Provoq');
  assert.equal(c.precoCentavos, 21800);
  assert.equal(c.custoCentavos, 12000);
  assert.equal(c.categoria, 'Armações');
  assert.equal(c.medidas, '47□16 130');
  assert.deepEqual([d.indice, d.peso, d.unidade], [3.688, 1.99, 'PAR']);
  assert.ok(e.avisos.some(x => x.c === 'qtd-fracionada'));
  assert.ok(e.avisos.some(x => x.c === 'nao-produto'));
  assert.equal(f.categoria, 'Anéis'); // "AENL" é erro de digitação de ANEL
  assert.equal(f.metal, 'Ouro 18k (750)');
  assert.equal(f.pedras, 'Diamante, Pérola');
  assert.ok(f.avisos.some(x => x.c === 'peso-divergente'));
  assert.ok(a.avisos.some(x => x.c === 'preco-por-indice'));
  assert.deepEqual(r.conferencia.confere, { itens: true, quantidade: true, valorEstoque: true, valorVenda: true, indice: true, peso: true });
});

test('relatórios sintéticos usados no navegador: tudo lido e conferido', () => {
  const c = I.ler(relatorioClientes(), { anoAtual: 2026 });
  assert.deepEqual(c.conferencia, { declarado: 5, lido: 5, confere: true });
  assert.equal(c.naoReconhecidos.length, 0);
  assert.equal(c.registros[4].endereco, 'Rua das Acacias');
  const p = I.ler(relatorioProdutos());
  assert.equal(p.registros.length, 6);
  assert.ok(Object.values(p.conferencia.confere).every(Boolean));
});

test('normalização: telefone, documento, data e nome', () => {
  assert.equal(I.telefone('55990001122').formatado, '(55) 99000-1122');
  assert.equal(I.telefone('5599000-1133').formatado, '(55) 99000-1133');
  assert.equal(I.telefone('055990001144').formatado, '(55) 99000-1144');
  assert.equal(I.telefone('991234567').formatado, '(55) 99123-4567'); // sem DDD
  assert.equal(I.telefone('').valido, false);
  assert.equal(I.telefone('12345').valido, false);
  assert.equal(I.cpfValido('52998224725'), true);
  assert.equal(I.cpfValido('52998224724'), false);
  assert.equal(I.cpfValido('11111111111'), false);
  assert.equal(I.cnpjValido('11222333000181'), true);
  assert.equal(I.cnpjValido('11222333000180'), false);
  assert.equal(I.dataBR('29/02/2024', 2026).iso, '2024-02-29');
  assert.equal(I.dataBR('29/02/2023', 2026).valida, false);
  assert.equal(I.dataBR('12/03/2027', 2026).valida, false); // no futuro
  assert.equal(I.titulo('ANA PAULA DE OLIVEIRA TESTE'), 'Ana Paula de Oliveira Teste');
  assert.equal(I.titulo('ANEL 750 18TA2523RP'), 'Anel 750 18TA2523RP');
  assert.equal(I.cidade('IJUI'), 'Ijuí');
  assert.equal(I.cidade('JOIA'), 'Jóia');
  assert.equal(I.cidade('SAO BORJA'), 'São Borja');
  assert.equal(I.cidade('NOVA CIDADE'), 'Nova Cidade');
  assert.equal(I.decimalBR('1.326,01'), 1326.01);
  assert.equal(I.centavosBR('231.125,83'), 23112583);
});

test('categoria: primeira palavra decide, com tolerância a erro de digitação', () => {
  const c = d => I.categoria(d).categoria;
  assert.equal(c('ANEL 416 P;2,2 APARADOR MEIA ALIANCA'), 'Anéis');
  assert.equal(c('OCULSO DE SOL BG7615 LENTE MARROM'), 'Óculos de sol');
  assert.equal(c('OCULOS REC. VOCH 8112'), 'Armações');
  assert.equal(c('PULSERIA 750 ELOS'), 'Pulseiras');
  assert.equal(c('PINGNETE 750 CRUZ'), 'Pingentes');
  assert.equal(c('CORFRFENTE 416 SINGAPURA'), 'Colares');
  assert.equal(c('CUIA C12P002 RUBI'), 'Cuias e bombas');
  assert.equal(c('BAMBA 03B CHATA'), 'Cuias e bombas');
  assert.equal(c('LENTE FILTRO AZUL'), 'Lentes');
  assert.equal(c('PROVOQ SOLAR OM50274'), 'Óculos de sol');
  assert.equal(I.categoria('COMPRAS'), null);
  assert.equal(I.pesoNaDescricao('ANEL 750 P; 4,37G'), 4.37);
  assert.equal(I.medidasArmacao('NIKE 54--19---140'), '54□19 140');
});

test('produtos: número no fim da descrição que termina na coluna QTD continua sendo descrição', () => {
  const itens = [...cabecalhoProdutos(1),
    it(1, 31, 225, 17, '063'), it(1, 85, 225, 23, '3122'), it(1, 163, 224, 213, 'OCULOS DE SOL CARMIM CRM 42302 C4 56*17'), it(1, 383.9, 224, 15.4, '146'),
    ...valores(1, 240, { preco: '588,00' }), it(1, 61, 225, 11, '00'), it(1, 160, 239, 60, 'Fornecedor:'), it(1, 39, 240, 44, 'SubTipo:'), it(1, 214, 238, 36, 'PROVOQ'),
    ...par(1, 240, '0', '0'), it(1, 731, 225, 44, 'MARCAS'), ...rodape(1, 562)];
  const r = I.ler(itens);
  const p = r.registros[0];
  assert.equal(p.quantidade, 1);
  assert.equal(p.descricaoOriginal, 'OCULOS DE SOL CARMIM CRM 42302 C4 56*17 146');
  assert.equal(p.medidas, '56□17 146');
  assert.equal(p.categoria, 'Óculos de sol');
  assert.equal(r.naoReconhecidos.length, 0);
});

test('para o sistema: cadastros trocados, movimentações de exemplo zeradas e nada se perde', () => {
  const dados = require('../js/data.js');
  const clientes = I.ler([...cabecalhoClientes(1),
    it(1, 30, 91, 13, '250'), it(1, 63, 91, 117, 'MARIA DA SILVA TESTE'), it(1, 459, 91, 52, '55991234567'), it(1, 530, 92, 57, '529.982.247-25'), it(1, 702, 92, 41, '12/03/1990'),
    it(1, 30, 101, 13, '251'), it(1, 63, 101, 117, 'SEM TELEFONE BOM'), it(1, 459, 101, 30, '123'),
    it(1, 143, 140, 20, '2'), it(1, 31, 140, 91, 'Total Clientes Listados:'), ...rodape(1, 578)], { anoAtual: 2026 });
  const produtos = I.ler([...cabecalhoProdutos(1),
    it(1, 31, 100, 17, '013'), it(1, 85, 100, 11, '61'), it(1, 163, 99, 146, 'PING 750 PIMENTA'), ...valores(1, 100), it(1, 61, 100, 11, '00'), ...par(1, 116, '1,098', '0,45'), it(1, 731, 100, 44, 'MARCAS'),
    it(1, 31, 130, 17, '058'), it(1, 85, 130, 23, '2151'), it(1, 163, 129, 200, 'NIKE NEO SQ 54--19---140'), ...valores(1, 130, { custo: '280,00', estoque: '280,00', preco: '1.058,00' }), it(1, 61, 130, 11, '00'), ...par(1, 146, '0', '0'), it(1, 731, 130, 44, 'MARCAS'),
    ...rodape(1, 562)]);
  const d = I.montarDados(dados, clientes, produtos, '2026-10-05');
  assert.equal(d.origem, 'importado');
  assert.equal(d.clientes.length, 2);
  assert.equal(d.produtos.length, 2);
  assert.equal(d.vendas.length + d.pedidos.length + d.agenda.length + d.financeiro.length, 0);
  const [maria, ruim] = d.clientes;
  assert.equal(maria.id, 'g250');
  assert.equal(maria.telefone, '(55) 99123-4567');
  assert.deepEqual(maria.documento, { tipo: 'cpf', digitos: '52998224725', valido: true });
  assert.equal(ruim.telefone, '');
  assert.equal(ruim.telefoneOriginal, '123');
  assert.deepEqual(ruim.tags, ['Revisar']);
  const [ping, nike] = d.produtos;
  assert.equal(ping.precoPorIndice, true);
  assert.equal(ping.atributos.Metal, 'Ouro 18k (750)');
  assert.equal(ping.atributos.Peso, '0,45 g');
  assert.equal(nike.precoCentavos, 105800);
  assert.equal(nike.segmento, 'otica');
  assert.equal(nike.atributos.Medidas, '54□19 140');
  assert.equal(d.importacao.clientes.total, 2);
  assert.equal(dados.vendas.length > 0, true, 'a base de exemplo original não pode ser alterada');
  const planilha = I.planilhaPendencias(clientes, produtos);
  assert.deepEqual(planilha[0], ['Cadastro', 'Código', 'Nome ou descrição', 'Gravidade', 'Problema']);
  assert.ok(planilha.some(l => l[1] === '251' && l[3] === 'Corrigir'));
});

test('importar de novo: atualiza pelo código e não apaga o que a loja fez no Lapidar', () => {
  const dados = require('../js/data.js');
  const ler = linhas => I.ler([...cabecalhoClientes(1), ...linhas, ...rodape(1, 578)], { anoAtual: 2026 });
  const cli = (y, cod, nome) => [it(1, 30, y, 13, cod), it(1, 63, y, 117, nome), it(1, 459, y, 52, '55991234567')];
  const primeira = I.montarDados(dados, ler([...cli(91, '301', 'CLIENTE UM'), ...cli(101, '302', 'CLIENTE DOIS')]), null, '2026-10-05', dados);
  // A loja usa o sistema: vende para o 302, cadastra um cliente novo e um produto novo.
  primeira.vendas.push({ id: 'v1', numero: 1, clienteId: 'g302', dia: '2026-10-06', itens: [{ produtoId: 'j01', qtd: 1, precoCentavos: 100 }], totalCentavos: 100 });
  primeira.proximoNumero.venda = 2;
  primeira.clientes.push({ id: 'cnovo', nome: 'Cliente do Balcão', telefone: '' });
  // O relatório novo não traz mais o 302, traz o 301 com outro nome e um código repetido.
  const segunda = I.montarDados(primeira, ler([...cli(91, '301', 'CLIENTE UM NOVO'), ...cli(101, '303', 'CLIENTE TRES'), ...cli(112, '303', 'CLIENTE TRES BIS')]), null, '2026-10-07', dados);
  assert.equal(segunda.vendas.length, 1, 'venda feita no Lapidar continua');
  assert.equal(segunda.proximoNumero.venda, 2, 'numeração não recomeça');
  const ids = segunda.clientes.map(c => c.id);
  assert.ok(ids.includes('g302'), 'cliente com venda não some, mesmo fora do relatório novo');
  assert.ok(ids.includes('cnovo'), 'cliente cadastrado no Lapidar continua');
  assert.equal(segunda.clientes.find(c => c.id === 'g301').nome, 'Cliente Um Novo');
  assert.deepEqual(ids.filter(i => i.startsWith('g303')), ['g303', 'g303-2'], 'código repetido ganha id próprio');
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(segunda.produtos.some(p => p.id === 'j01'), 'produto de exemplo usado numa venda não some');
});

test('segundo relatório numa base já importada: cadastro criado no Lapidar fica, exemplo sai, preço local fica', () => {
  const dados = require('../js/data.js');
  const clientes = I.ler([...cabecalhoClientes(1), it(1, 30, 91, 13, '301'), it(1, 63, 91, 117, 'CLIENTE UM'), it(1, 143, 140, 20, '1'), it(1, 31, 140, 91, 'Total Clientes Listados:'), ...rodape(1, 578)], { anoAtual: 2026 });
  const dia1 = I.montarDados(dados, clientes, null, '2026-10-05', dados);
  dia1.produtos.push({ id: 'nloja1', nome: 'Aliança encomenda especial', precoCentavos: 100 });
  const dia2 = I.montarDados(dia1, null, I.ler(relatorioProdutos()), '2026-10-06', dados);
  assert.ok(dia2.produtos.some(p => p.id === 'nloja1'), 'produto cadastrado no Lapidar continua');
  assert.ok(!dia2.produtos.some(p => p.id === 'j01'), 'produto de exemplo sai');
  // A loja define o preço de uma peça que veio sem preço; a reimportação não apaga.
  dia2.produtos.find(p => p.id === 'gp61').precoCentavos = 15000;
  dia2.produtos.find(p => p.id === 'gp61').precoLocal = true;
  const dia3 = I.montarDados(dia2, null, I.ler(relatorioProdutos()), '2026-10-07', dados);
  assert.equal(dia3.produtos.find(p => p.id === 'gp61').precoCentavos, 15000);
});

test('leitor: SOLAR é óculos, lente de contato não vai ao laboratório, peso igual ao nº da página fica, telefone de preenchimento é inválido', () => {
  const c = d => I.categoria(d).categoria;
  assert.equal(c('SOLAR RAY BAN RB3025'), 'Óculos de sol');
  assert.equal(c('LENTE DE CONTATO ACUVUE OASYS'), 'Lentes de contato');
  assert.equal(c('ESTOJO PARA OCULOS'), 'Acessórios');
  assert.equal(c('CORDAO P/ OCULOS'), 'Acessórios');
  assert.equal(c('PINO 750 TARRAXA'), 'Peças e fechos');
  assert.equal(c('AENL 750 ZIRC'), 'Anéis');
  assert.equal(I.telefone('99999999').valido, false);
  assert.equal(I.telefone('(55) 9999-9999').valido, false);
  assert.equal(I.mascararDocumento(I.documento('529.982.247-2')), '*******472', 'documento fora do padrão sai mascarado');
  // Último produto da página com peso "2" desenhado na altura do rodapé da página 2.
  const itens = relatorioProdutos().map(i => (i.p === 1 && i.y === 561 && i.x > 760 ? { ...i, s: '1' } : i));
  const r = I.ler(itens);
  assert.equal(r.registros.find(p => p.codigo === '2114').peso, 1, 'peso igual ao número da página não é rodapé');
});

test('separação: "R." e cidade conhecida também são fronteira; colagem sem fronteira vira aviso', () => {
  const k = 0.0091;
  const HELV2 = { ' ': 278, '.': 278, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, I: 278, L: 556, M: 833, N: 722, O: 778, P: 667, R: 722, S: 667, T: 611, U: 722, V: 667, X: 667, Z: 611 };
  const lg = (s, kk) => [...s].reduce((t, ch) => t + (/\d/.test(ch) ? 556 : HELV2[ch]), 0) * kk;
  const colado = (p, y, x, inicio, a, b) => { const kk = (inicio - x) / lg(a, 1); return it(p, x, y, lg(a + b, kk), a + b); };
  const itens = [...cabecalhoClientes(1),
    it(1, 30, 91, 13, '911'), colado(1, 91, 63, 220, 'ANA TESTE DE SOUZA', 'R. DAS ACACIAS'), it(1, 360, 92, 14, 'IJUI'),
    it(1, 30, 101, 13, '912'), it(1, 63, 101, 60, 'BIA TESTE'), colado(1, 101, 220, 360, 'RUA DAS FLORES', 'CRUZ ALTA'),
    it(1, 30, 112, 13, '913'), it(1, 63, 112, 60, 'CAIO TESTE'), colado(1, 112, 220, 360, 'RUA DO PORTO', 'BOAVISTA'),
    ...rodape(1, 578)];
  const [a, b, x] = I.lerClientes(itens, { anoAtual: 2026 }).registros;
  assert.equal(a.endereco, 'R. das Acacias');
  assert.equal(b.cidade, 'Cruz Alta');
  assert.ok(x.avisos.some(v => v.c === 'campos-suspeitos'), 'colagem sem sinal de fronteira avisa');
});

