'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Dinheiro = require('../js/regras/dinheiro.js');
const Datas = require('../js/regras/datas.js');
const Busca = require('../js/regras/busca.js');
const Venda = require('../js/regras/venda.js');
const Pedidos = require('../js/regras/pedidos.js');
const Csv = require('../js/regras/csv.js');
const dados = require('../js/data.js');

test('dinheiro: lê os formatos que o balcão digita', () => {
  assert.equal(Dinheiro.lerReais('1.234,56'), 123456);
  assert.equal(Dinheiro.lerReais('1234,5'), 123450);
  assert.equal(Dinheiro.lerReais('1234.56'), 123456);
  assert.equal(Dinheiro.lerReais('1.234'), 123400);
  assert.equal(Dinheiro.lerReais('R$ 12'), 1200);
  assert.equal(Dinheiro.lerReais('0,1'), 10);
  assert.equal(Dinheiro.lerReais('abc'), null);
  assert.equal(Dinheiro.lerReais(''), null);
  assert.equal(Dinheiro.formatar(123456), 'R$ 1.234,56');
});

test('dinheiro: parcelas nunca perdem centavo', () => {
  const p = Dinheiro.dividir(100000, 3);
  assert.deepEqual(p, [33334, 33333, 33333]);
  assert.equal(p.reduce((a, b) => a + b), 100000);
  for (const n of [1, 2, 7, 10, 12]) assert.equal(Dinheiro.dividir(98765, n).reduce((a, b) => a + b), 98765);
});

test('datas: dia civil no fuso da loja, não em UTC (bug do sistema antigo)', () => {
  // 22h de 04/10 em Ijuí (horário de Brasília) = 01h de 05/10 em UTC.
  const instante = new Date('2026-10-05T01:00:00Z');
  assert.equal(Datas.diaCivil(instante, 'America/Sao_Paulo'), '2026-10-04');
  assert.equal(instante.toISOString().slice(0, 10), '2026-10-05'); // o que o Vendaro mostrava
});

test('datas: soma de meses respeita fim de mês', () => {
  assert.equal(Datas.somarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(Datas.somarMeses('2028-01-31', 1), '2028-02-29');
  assert.equal(Datas.somarMeses('2026-11-15', 3), '2027-02-15');
  assert.equal(Datas.somarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(Datas.diferencaDias('2026-10-01', '2026-10-05'), 4);
  assert.equal(Datas.inicioDaSemana('2026-10-04'), '2026-09-28'); // domingo → segunda anterior
  assert.equal(Datas.inicioDaSemana('2026-10-05'), '2026-10-05');
});

test('datas: aniversário e textos relativos', () => {
  assert.equal(Datas.diasAteAniversario('1990-10-05', '2026-10-05'), 0);
  assert.equal(Datas.diasAteAniversario('1990-10-04', '2026-10-05'), 364);
  assert.equal(Datas.diasAteAniversario('1992-02-29', '2027-02-27'), 1);
  assert.equal(Datas.relativo('2026-10-06', '2026-10-05'), 'amanhã');
  assert.equal(Datas.relativo('2026-10-02', '2026-10-05'), 'há 3 dias');
});

test('busca: sem acento, plural, ordem livre e erro de digitação', () => {
  const campos = [{ chave: 'nome', peso: 3 }, { chave: 'categoria', peso: 1 }];
  const itens = [
    { nome: 'Aliança de ouro 18k', categoria: 'Joias' },
    { nome: 'Armação acetato tartaruga', categoria: 'Óculos' },
    { nome: 'Brinco de pérola', categoria: 'Joias' },
  ];
  assert.equal(Busca.buscar(itens, 'alianca', campos)[0].nome, 'Aliança de ouro 18k');
  assert.equal(Busca.buscar(itens, 'ALIANÇAS', campos)[0].nome, 'Aliança de ouro 18k');
  assert.equal(Busca.buscar(itens, 'ouro aliança', campos)[0].nome, 'Aliança de ouro 18k');
  assert.equal(Busca.buscar(itens, 'perloa', campos)[0].nome, 'Brinco de pérola'); // troca de letras
  assert.equal(Busca.buscar(itens, 'tartaruaga', campos)[0].nome, 'Armação acetato tartaruga');
  assert.equal(Busca.buscar(itens, 'oculos', campos)[0].nome, 'Armação acetato tartaruga'); // por categoria
  assert.equal(Busca.buscar(itens, 'xyzw', campos).length, 0);
});

test('busca: telefone por trecho de dígitos', () => {
  const campos = [{ chave: 'nome' }, { chave: 'tel', telefone: true }];
  const r = Busca.buscar([{ nome: 'Ana', tel: '(55) 98812-3456' }, { nome: 'Bia', tel: '(55) 99100-0001' }], '8812', campos);
  assert.equal(r.length, 1);
  assert.equal(r[0].nome, 'Ana');
});

test('busca: catálogo real da demo responde aos termos de balcão', () => {
  const campos = [{ chave: 'nome', peso: 3 }, { chave: 'categoria', peso: 1 }, { chave: 'sku', peso: 2 }];
  for (const q of ['aliança', 'brinco', 'lente multifocal', 'armação', 'solitário', 'relógio', 'colar']) {
    assert.ok(Busca.buscar(dados.produtos, q, campos).length > 0, `sem resultado para "${q}"`);
  }
});

test('venda: total com desconto e limite', () => {
  const itens = [{ precoCentavos: 189000, qtd: 1 }, { precoCentavos: 25000, qtd: 2 }];
  assert.deepEqual(Venda.calcular(itens, null), { subtotal: 239000, desconto: 0, total: 239000, pecas: 3 });
  assert.equal(Venda.calcular(itens, { tipo: 'pct', valor: 10 }).total, 215100);
  assert.equal(Venda.calcular(itens, { tipo: 'valor', valor: 9999999 }).total, 0);
});

test('venda: pagamento dividido, troco só em dinheiro', () => {
  let r = Venda.conferirPagamentos(100000, [{ forma: 'pix', valor: 40000 }, { forma: 'credito', valor: 60000 }]);
  assert.equal(r.fechado, true);
  assert.equal(r.troco, 0);
  r = Venda.conferirPagamentos(10000, [{ forma: 'dinheiro', valor: 15000 }]);
  assert.equal(r.troco, 5000);
  assert.equal(r.fechado, true);
  r = Venda.conferirPagamentos(10000, [{ forma: 'pix', valor: 12000 }]);
  assert.equal(r.fechado, false);
  assert.equal(r.erros.length, 1);
  r = Venda.conferirPagamentos(10000, [{ forma: 'pix', valor: 3000 }]);
  assert.equal(r.falta, 7000);
});

test('venda: crediário gera parcelas mensais que somam o total', () => {
  const p = Venda.parcelas(100000, 3, '2026-10-31');
  assert.deepEqual(p.map(x => x.vencimento), ['2026-10-31', '2026-11-30', '2026-12-31']);
  assert.equal(p.reduce((s, x) => s + x.valor, 0), 100000);
});

test('pedidos: etapas próprias por tipo e situação pelo prazo', () => {
  assert.equal(Pedidos.proxima('otica', 'laboratorio').id, 'montagem');
  assert.equal(Pedidos.proxima('joia', 'avaliacao').id, 'aprovado');
  assert.equal(Pedidos.proxima('joia', 'entregue'), null);
  assert.equal(Pedidos.anterior('otica', 'recebido'), null);
  assert.equal(Pedidos.situacao({ etapa: 'montagem', prazo: '2026-10-03' }, '2026-10-05').nivel, 'atrasado');
  assert.equal(Pedidos.situacao({ etapa: 'pronto', prazo: '2026-10-01' }, '2026-10-05').nivel, 'pronto');
  assert.equal(Pedidos.situacao({ etapa: 'recebido', prazo: '2026-10-05' }, '2026-10-05').texto, 'Vence hoje');
});

test('csv: neutraliza fórmula e mantém número negativo', () => {
  assert.equal(Csv.celula('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(Csv.celula('@SUM(A1)'), '"\'@SUM(A1)"');
  assert.equal(Csv.celula('-12,50'), '"-12,50"');
  assert.ok(Csv.gerar([['a', 'b']]).startsWith('﻿"a";"b"'));
});

test('dados: integridade da demonstração', () => {
  const ids = new Set(dados.produtos.map(p => p.id));
  assert.equal(ids.size, dados.produtos.length, 'id de produto repetido');
  const cli = new Set(dados.clientes.map(c => c.id));
  for (const v of dados.vendas) {
    assert.ok(!v.clienteId || cli.has(v.clienteId), `venda ${v.id} com cliente inexistente`);
    for (const i of v.itens) assert.ok(ids.has(i.produtoId), `venda ${v.id} com produto inexistente`);
  }
  for (const p of dados.pedidos) {
    assert.ok(cli.has(p.clienteId));
    assert.ok(Pedidos.indice(p.tipo, p.etapa) >= 0, `etapa inválida em ${p.id}`);
  }
  for (const p of dados.produtos) assert.ok(Number.isInteger(p.precoCentavos) && p.precoCentavos > 0);
});

const Atencao = require('../js/regras/atencao.js');
test('atenção: atrasado vem antes de oportunidade e nada fica de fora', () => {
  const l = Atencao.listar(dados, dados.hoje);
  assert.ok(l.length >= 6);
  assert.equal(l[0].nivel, 'critico');
  const tipos = new Set(l.map(i => i.tipo));
  for (const t of ['pedido', 'cobranca', 'retirada', 'aniversario', 'receita', 'estoque', 'orcamento']) assert.ok(tipos.has(t), `faltou ${t}`);
  const ordem = { critico: 4, hoje: 3, breve: 2, oportunidade: 1 };
  for (let i = 1; i < l.length; i++) assert.ok(ordem[l[i - 1].nivel] >= ordem[l[i].nivel]);
});
