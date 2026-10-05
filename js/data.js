/* Fonte única de dados da demonstração. TUDO AQUI É FICTÍCIO: nomes, telefones e valores
   servem só para mostrar o sistema funcionando. Os dados reais virão dos relatórios do cliente.
   As datas são relativas a "hoje", para a demonstração parecer viva em qualquer dia. */
(function (root, factory) {
  var Datas = root.Datas || (typeof require === 'function' ? require('./regras/datas.js') : null);
  var api = factory(Datas);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DadosDemo = api;
})(typeof self !== 'undefined' ? self : this, function (Datas) {
  'use strict';
  var HOJE = Datas.hoje();
  function dia(n) { return Datas.somarDias(HOJE, n); }
  // Aniversário que cai daqui a n dias, com o ano de nascimento informado.
  function nasc(ano, emDias) { return ano + dia(emDias).slice(4); }
  var R = function (reais) { return Math.round(reais * 100); };

  var loja = {
    nome: 'La Boutique',
    razaoSocial: 'La Boutique Joalheria e Óptica Ltda',
    segmento: 'Joalheria & Óptica',
    unidade: 'Matriz',
    cidade: 'Ijuí · RS',
    horario: 'Seg a sex 9h–18h · Sáb 9h–13h'
  };

  var equipe = [
    { id: 'u1', nome: 'Tiago', sobrenome: 'Martins', perfil: 'dono' },
    { id: 'u2', nome: 'Camila', sobrenome: 'Rocha', perfil: 'vendas' },
    { id: 'u3', nome: 'Rafael', sobrenome: 'Lima', perfil: 'lab' }
  ];

  /* Perfis por função. Quem é novo entra como Vendas: acesso amplo só por escolha explícita. */
  var perfis = {
    dono: { nome: 'Proprietário', resumo: 'Vê tudo: vendas, financeiro, relatórios e ajustes.', telas: ['hoje', 'clientes', 'vendas', 'pedidos', 'produtos', 'financeiro', 'agenda', 'relatorios', 'ajustes'], custo: true },
    vendas: { nome: 'Vendas', resumo: 'Atende, vende, faz orçamento e acompanha pedidos.', telas: ['hoje', 'clientes', 'vendas', 'pedidos', 'produtos', 'agenda', 'ajustes'], custo: false },
    lab: { nome: 'Laboratório e bancada', resumo: 'Move pedidos de óculos e serviços de joia até a entrega.', telas: ['hoje', 'pedidos', 'agenda', 'clientes', 'ajustes'], custo: false }
  };

  /* Catálogo. Atributos mudam por segmento: joia tem metal/teor/peso; armação tem medidas; lente tem índice. */
  var produtos = [
    { id: 'j01', nome: 'Anel solitário ouro 18k com diamante', segmento: 'joia', categoria: 'Anéis', sku: 'AN-SOL-18K-010', precoCentavos: R(2890), custoCentavos: R(1480), estoque: 3, minimo: 2, ilustracao: 'anel', atributos: { Metal: 'Ouro amarelo 18k (750)', Peso: '2,1 g', Pedra: 'Diamante 0,10 ct', Aro: '12 a 20, sob medida' } },
    { id: 'j02', nome: 'Par de alianças ouro 18k 4 mm', segmento: 'joia', categoria: 'Alianças', sku: 'AL-PAR-18K-4MM', precoCentavos: R(3980), custoCentavos: R(2350), estoque: 4, minimo: 2, ilustracao: 'aliancas', gera: 'joia', atributos: { Metal: 'Ouro amarelo 18k (750)', Peso: '8,0 g o par', Largura: '4 mm', Acabamento: 'Polido, anatômica' } },
    { id: 'j03', nome: 'Aliança prata 950 3 mm', segmento: 'joia', categoria: 'Alianças', sku: 'AL-UN-P950-3MM', precoCentavos: R(289), custoCentavos: R(95), estoque: 12, minimo: 6, ilustracao: 'aliancas', atributos: { Metal: 'Prata 950', Peso: '3,4 g', Largura: '3 mm' } },
    { id: 'j04', nome: 'Brinco argola ouro 18k 15 mm', segmento: 'joia', categoria: 'Brincos', sku: 'BR-ARG-18K-15', precoCentavos: R(1190), custoCentavos: R(640), estoque: 5, minimo: 2, ilustracao: 'brinco', atributos: { Metal: 'Ouro amarelo 18k (750)', Peso: '1,6 g o par', Diâmetro: '15 mm' } },
    { id: 'j05', nome: 'Brinco ponto de luz prata 925', segmento: 'joia', categoria: 'Brincos', sku: 'BR-PL-P925-4', precoCentavos: R(159), custoCentavos: R(48), estoque: 18, minimo: 8, ilustracao: 'brinco', atributos: { Metal: 'Prata 925', Pedra: 'Zircônia 4 mm', Fecho: 'Tarraxa' } },
    { id: 'j06', nome: 'Colar veneziana ouro 18k 45 cm', segmento: 'joia', categoria: 'Colares', sku: 'CO-VEN-18K-45', precoCentavos: R(1750), custoCentavos: R(990), estoque: 2, minimo: 2, ilustracao: 'colar', atributos: { Metal: 'Ouro amarelo 18k (750)', Peso: '2,4 g', Comprimento: '45 cm' } },
    { id: 'j07', nome: 'Pingente coração ouro branco 18k', segmento: 'joia', categoria: 'Pingentes', sku: 'PI-COR-OB18K', precoCentavos: R(690), custoCentavos: R(330), estoque: 6, minimo: 2, ilustracao: 'pingente', atributos: { Metal: 'Ouro branco 18k, ródio', Peso: '0,9 g', Pedra: 'Zircônia' } },
    { id: 'j08', nome: 'Pulseira riviera prata 925', segmento: 'joia', categoria: 'Pulseiras', sku: 'PU-RIV-P925-18', precoCentavos: R(420), custoCentavos: R(150), estoque: 1, minimo: 3, ilustracao: 'pulseira', atributos: { Metal: 'Prata 925', Pedra: 'Zircônias 2 mm', Comprimento: '18 cm' } },
    { id: 'j09', nome: 'Brinco pérola cultivada ouro 18k', segmento: 'joia', categoria: 'Brincos', sku: 'BR-PER-18K-7', precoCentavos: R(980), custoCentavos: R(470), estoque: 3, minimo: 2, ilustracao: 'brinco', atributos: { Metal: 'Ouro amarelo 18k (750)', Pedra: 'Pérola cultivada 7 mm' } },
    { id: 'j10', nome: 'Relógio feminino aço dourado', segmento: 'joia', categoria: 'Relógios', sku: 'RE-FEM-ACO-DOU', precoCentavos: R(590), custoCentavos: R(280), estoque: 4, minimo: 2, ilustracao: 'relogio', atributos: { Caixa: 'Aço 32 mm, banho dourado', Pulseira: 'Aço', Resistência: '5 ATM' } },
    { id: 'j11', nome: 'Corrente cartier prata 925 60 cm', segmento: 'joia', categoria: 'Colares', sku: 'CO-CAR-P925-60', precoCentavos: R(260), custoCentavos: R(90), estoque: 9, minimo: 4, ilustracao: 'colar', atributos: { Metal: 'Prata 925', Peso: '6,2 g', Comprimento: '60 cm' } },
    { id: 'j12', nome: 'Anel de formatura ouro 18k', segmento: 'joia', categoria: 'Anéis', sku: 'AN-FOR-18K-ENC', precoCentavos: R(2200), custoCentavos: R(1250), estoque: 0, minimo: 0, encomenda: true, ilustracao: 'anel', gera: 'joia', atributos: { Metal: 'Ouro amarelo 18k (750)', Pedra: 'Conforme o curso', Prazo: '20 dias úteis' } },

    { id: 'o01', nome: 'Armação acetato tartaruga', segmento: 'otica', categoria: 'Armações', sku: 'AR-ACE-TAR-52', precoCentavos: R(489), custoCentavos: R(190), estoque: 6, minimo: 3, ilustracao: 'armacao', atributos: { Medidas: '52□18 145', Material: 'Acetato', Formato: 'Retangular', Cor: 'Tartaruga' } },
    { id: 'o02', nome: 'Armação metal dourada redonda', segmento: 'otica', categoria: 'Armações', sku: 'AR-MET-RED-49', precoCentavos: R(420), custoCentavos: R(160), estoque: 4, minimo: 2, ilustracao: 'armacao', atributos: { Medidas: '49□21 140', Material: 'Metal', Formato: 'Redondo', Cor: 'Dourado' } },
    { id: 'o03', nome: 'Armação infantil flexível TR90', segmento: 'otica', categoria: 'Armações', sku: 'AR-INF-TR90-46', precoCentavos: R(259), custoCentavos: R(85), estoque: 1, minimo: 3, ilustracao: 'armacao', atributos: { Medidas: '46□16 125', Material: 'TR90 flexível', Faixa: '6 a 10 anos' } },
    { id: 'o04', nome: 'Óculos de sol polarizado aviador', segmento: 'otica', categoria: 'Óculos de sol', sku: 'SO-AVI-POL-58', precoCentavos: R(399), custoCentavos: R(150), estoque: 7, minimo: 3, ilustracao: 'sol', atributos: { Medidas: '58□14 140', Lente: 'Polarizada UV400', Cor: 'G15' } },
    { id: 'o05', nome: 'Óculos de sol gatinho acetato', segmento: 'otica', categoria: 'Óculos de sol', sku: 'SO-GAT-ACE-53', precoCentavos: R(459), custoCentavos: R(175), estoque: 3, minimo: 2, ilustracao: 'sol', atributos: { Medidas: '53□19 145', Lente: 'UV400 degradê', Cor: 'Preto' } },
    { id: 'o06', nome: 'Lente visão simples 1.56 antirreflexo', segmento: 'otica', categoria: 'Lentes', sku: 'LE-VS-156-AR', precoCentavos: R(290), custoCentavos: R(95), estoque: 99, minimo: 0, laboratorio: true, ilustracao: 'lente', gera: 'otica', atributos: { Índice: '1.56', Tipo: 'Visão simples', Tratamento: 'Antirreflexo', Venda: 'Par, sob receita' } },
    { id: 'o07', nome: 'Lente visão simples 1.67 filtro azul', segmento: 'otica', categoria: 'Lentes', sku: 'LE-VS-167-BC', precoCentavos: R(690), custoCentavos: R(260), estoque: 99, minimo: 0, laboratorio: true, ilustracao: 'lente', gera: 'otica', atributos: { Índice: '1.67 (fina)', Tipo: 'Visão simples', Tratamento: 'Filtro de luz azul + AR', Venda: 'Par, sob receita' } },
    { id: 'o08', nome: 'Lente multifocal digital 1.60', segmento: 'otica', categoria: 'Lentes', sku: 'LE-MF-160-DIG', precoCentavos: R(1490), custoCentavos: R(610), estoque: 99, minimo: 0, laboratorio: true, ilustracao: 'lente', gera: 'otica', atributos: { Índice: '1.60', Tipo: 'Multifocal digital', Tratamento: 'Antirreflexo premium', Venda: 'Par, sob receita' } },
    { id: 'o09', nome: 'Lente fotossensível 1.56', segmento: 'otica', categoria: 'Lentes', sku: 'LE-FS-156-CIN', precoCentavos: R(590), custoCentavos: R(230), estoque: 99, minimo: 0, laboratorio: true, ilustracao: 'lente', gera: 'otica', atributos: { Índice: '1.56', Tipo: 'Visão simples', Tratamento: 'Fotossensível cinza', Venda: 'Par, sob receita' } },
    { id: 'o10', nome: 'Lente de contato mensal (caixa 6)', segmento: 'otica', categoria: 'Lentes de contato', sku: 'LC-MEN-6UN', precoCentavos: R(189), custoCentavos: R(92), estoque: 14, minimo: 6, ilustracao: 'contato', atributos: { Descarte: 'Mensal', Unidades: '6 por caixa', Material: 'Silicone-hidrogel' } },
    { id: 'o11', nome: 'Solução multiuso 360 ml', segmento: 'otica', categoria: 'Acessórios', sku: 'AC-SOL-360', precoCentavos: R(49), custoCentavos: R(19), estoque: 2, minimo: 5, ilustracao: 'frasco', atributos: { Volume: '360 ml', Uso: 'Lentes de contato' } },

    { id: 's01', nome: 'Ajuste de aro', segmento: 'servico', categoria: 'Serviços', sku: 'SV-AJUSTE-ARO', precoCentavos: R(80), custoCentavos: R(15), estoque: null, minimo: 0, ilustracao: 'servico', gera: 'joia', atributos: { Prazo: '3 dias úteis', Onde: 'Bancada própria' } },
    { id: 's02', nome: 'Gravação a laser', segmento: 'servico', categoria: 'Serviços', sku: 'SV-GRAVACAO', precoCentavos: R(60), custoCentavos: R(10), estoque: null, minimo: 0, ilustracao: 'servico', gera: 'joia', atributos: { Prazo: '2 dias úteis', Limite: 'Até 20 caracteres' } },
    { id: 's03', nome: 'Banho de ródio', segmento: 'servico', categoria: 'Serviços', sku: 'SV-RODIO', precoCentavos: R(120), custoCentavos: R(35), estoque: null, minimo: 0, ilustracao: 'servico', gera: 'joia', atributos: { Prazo: '5 dias úteis' } },
    { id: 's04', nome: 'Limpeza e polimento de joia', segmento: 'servico', categoria: 'Serviços', sku: 'SV-POLIMENTO', precoCentavos: R(50), custoCentavos: R(8), estoque: null, minimo: 0, ilustracao: 'servico', atributos: { Prazo: 'Na hora' } }
  ];

  var clientes = [
    { id: 'c01', nome: 'Maria Clara Souza', telefone: '(55) 99000-0101', email: 'mariaclara@exemplo.com', nascimento: nasc(1968, 41), desde: dia(-900), interesses: ['otica', 'joia'], tags: ['VIP'],
      receita: { data: dia(-60), validade: dia(305), profissional: 'Optometrista parceira', tipo: 'Multifocal', OD: { esf: '+1,75', cil: '-0,50', eixo: '90', add: '+2,25', dnp: '32,0', alt: '19' }, OE: { esf: '+2,00', cil: '-0,75', eixo: '85', add: '+2,25', dnp: '31,5', alt: '19' } },
      notas: 'Prefere armações leves. Sempre pede limpeza ao retirar.' },
    { id: 'c02', nome: 'João Pedro Almeida', telefone: '(55) 99000-0102', nascimento: nasc(1991, 120), desde: dia(-420), interesses: ['joia'], tags: [], notas: 'Comprou alianças no crediário. Prefere contato à tarde.' },
    { id: 'c03', nome: 'Fernanda Lima Batista', telefone: '(55) 99000-0103', email: 'fernanda.lb@exemplo.com', nascimento: nasc(1994, 0), desde: dia(-610), interesses: ['joia'], tags: ['VIP'], joia: { aro: '14', metal: 'Ouro amarelo', datas: 'Aniversário de namoro em dezembro' }, notas: 'Gosta de peças delicadas, ponto de luz e pingentes.' },
    { id: 'c04', nome: 'Pedro Henrique Costa', telefone: '(55) 99000-0104', nascimento: nasc(1987, 200), desde: dia(-372), interesses: ['otica'], tags: [],
      receita: { data: dia(-356), validade: dia(9), profissional: 'Externo', tipo: 'Visão simples', OD: { esf: '-2,25', cil: '-0,75', eixo: '180', add: '', dnp: '31,0', alt: '' }, OE: { esf: '-2,00', cil: '-0,50', eixo: '175', add: '', dnp: '31,0', alt: '' } },
      notas: 'Usa computador o dia todo. Interessado em filtro de luz azul.' },
    { id: 'c05', nome: 'Luana Martins Rocha', telefone: '(55) 99000-0105', email: 'luana.mr@exemplo.com', nascimento: nasc(1997, 77), desde: dia(-35), interesses: ['joia'], tags: ['Noiva'], joia: { aro: '13', metal: 'Ouro amarelo', datas: 'Casamento em ' + Datas.curta(dia(68)) }, notas: 'Noivo: Matheus, aro 21. Quer gravar a data por dentro.' },
    { id: 'c06', nome: 'Ricardo Nogueira', telefone: '(55) 99000-0106', nascimento: nasc(1975, 160), desde: dia(-1500), interesses: ['joia', 'otica'], tags: ['VIP'], joia: { aro: '18', metal: 'Ouro amarelo' }, notas: 'Cliente antigo. Compra presentes para a esposa no Natal.' },
    { id: 'c07', nome: 'Beatriz Ferreira', telefone: '(55) 99000-0107', nascimento: nasc(2001, 95), desde: dia(-260), interesses: ['otica'], tags: ['Lente de contato'],
      receita: { data: dia(-150), validade: dia(215), profissional: 'Externo', tipo: 'Lente de contato', OD: { esf: '-3,50', cil: '', eixo: '', add: '', dnp: '', alt: '' }, OE: { esf: '-3,25', cil: '', eixo: '', add: '', dnp: '', alt: '' } },
      notas: 'Compra lente mensal a cada 3 meses.' },
    { id: 'c08', nome: 'Gabriel Santos', telefone: '(55) 99000-0108', nascimento: nasc(1999, 230), desde: dia(-190), interesses: ['otica'], tags: [], notas: '' },
    { id: 'c09', nome: 'Ana Júlia Pereira', telefone: '(55) 99000-0109', nascimento: nasc(1985, 300), desde: dia(-80), interesses: ['otica'], tags: [],
      receita: { data: dia(-12), validade: dia(353), profissional: 'Externo', tipo: 'Visão simples (Lívia, 8 anos)', OD: { esf: '+1,00', cil: '-0,25', eixo: '10', add: '', dnp: '27,0', alt: '' }, OE: { esf: '+1,25', cil: '', eixo: '', add: '', dnp: '27,0', alt: '' } },
      notas: 'Óculos para a filha, Lívia (8 anos). Pediu armação resistente.' },
    { id: 'c10', nome: 'Carlos Eduardo Ramos', telefone: '(55) 99000-0110', nascimento: nasc(1980, 50), desde: dia(-30), interesses: ['joia'], tags: [], notas: 'Procurando relógio para presente.' },
    { id: 'c11', nome: 'Juliana Teixeira', telefone: '(55) 99000-0111', email: 'ju.teixeira@exemplo.com', nascimento: nasc(1990, 3), desde: dia(-700), interesses: ['joia'], tags: [], joia: { aro: '15', metal: 'Ouro branco' }, notas: '' },
    { id: 'c12', nome: 'Marcos Vinícius Melo', telefone: '(55) 99000-0112', nascimento: nasc(1972, 180), desde: dia(-760), interesses: ['otica'], tags: [],
      receita: { data: dia(-385), validade: dia(-20), profissional: 'Externo', tipo: 'Multifocal', OD: { esf: '+0,75', cil: '', eixo: '', add: '+2,00', dnp: '32,5', alt: '20' }, OE: { esf: '+1,00', cil: '-0,25', eixo: '95', add: '+2,00', dnp: '32,0', alt: '20' } },
      notas: 'Receita vencida. Tem orçamento de multifocal em aberto.' },
    { id: 'c13', nome: 'Patrícia Gomes', telefone: '(55) 99000-0113', nascimento: nasc(1983, 140), desde: dia(-140), interesses: ['otica'], tags: [],
      receita: { data: dia(-14), validade: dia(351), profissional: 'Optometrista parceira', tipo: 'Visão simples', OD: { esf: '-1,25', cil: '-0,50', eixo: '170', add: '', dnp: '30,5', alt: '' }, OE: { esf: '-1,50', cil: '', eixo: '', add: '', dnp: '30,5', alt: '' } },
      notas: '' },
    { id: 'c14', nome: 'Rodrigo Barros', telefone: '(55) 99000-0114', nascimento: nasc(1993, 260), desde: dia(-20), interesses: ['joia'], tags: [], notas: 'Gravação: "R & M 12.12".' },
    { id: 'c15', nome: 'Larissa Duarte', telefone: '(55) 99000-0115', nascimento: nasc(1996, 210), desde: dia(-330), interesses: ['joia'], tags: [], joia: { aro: '12', metal: 'Ouro branco' }, notas: '' },
    { id: 'c16', nome: 'Sebastião Moura', telefone: '(55) 99000-0116', nascimento: nasc(1951, 110), desde: dia(-15), interesses: ['otica'], tags: ['Crediário'],
      receita: { data: dia(-16), validade: dia(349), profissional: 'Optometrista parceira', tipo: 'Multifocal', OD: { esf: '+2,50', cil: '-1,00', eixo: '95', add: '+2,75', dnp: '33,0', alt: '21' }, OE: { esf: '+2,25', cil: '-0,75', eixo: '80', add: '+2,75', dnp: '32,5', alt: '21' } },
      notas: 'Prefere ser chamado de seu Sebastião. Filha acompanha nas compras.' }
  ];

  /* Gerador pseudoaleatório com semente fixa: a demonstração sai igual sempre e o teste é estável. */
  function sementeAleatoria(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rnd = sementeAleatoria(20261005);
  function escolher(lista) { return lista[Math.floor(rnd() * lista.length)]; }

  var vendaveis = ['j03', 'j05', 'j05', 'j04', 'j07', 'j08', 'j09', 'j10', 'j11', 'j11', 'j06', 'j01', 'j02', 'o01', 'o02', 'o04', 'o04', 'o05', 'o10', 'o10', 'o11', 'o06', 'o07', 'o08', 's01', 's02', 's04'];
  var precoDe = {};
  produtos.forEach(function (p) { precoDe[p.id] = p.precoCentavos; });
  var formas = ['pix', 'pix', 'credito', 'credito', 'debito', 'dinheiro'];
  var vendedores = ['u1', 'u2', 'u2', 'u3'];

  var vendas = [];
  var numero = 1001;
  for (var d = -34; d <= -1; d++) {
    var semana = Datas.diaDaSemana(dia(d));
    if (semana === 0) continue; // domingo fechado
    var quantas = semana === 6 ? 2 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 4);
    for (var k = 0; k < quantas; k++) {
      var itens = [];
      var n = rnd() < 0.7 ? 1 : 2;
      for (var x = 0; x < n; x++) {
        var pid = escolher(vendaveis);
        if (!itens.some(function (i) { return i.produtoId === pid; })) itens.push({ produtoId: pid, qtd: 1, precoCentavos: precoDe[pid] });
      }
      // Lente sozinha não existe no balcão: vai junto de uma armação.
      if (itens.some(function (i) { return /^o0[678]$/.test(i.produtoId); }) && !itens.some(function (i) { return /^o0[123]$/.test(i.produtoId); })) {
        itens.push({ produtoId: 'o01', qtd: 1, precoCentavos: precoDe.o01 });
      }
      var total = itens.reduce(function (s, i) { return s + i.precoCentavos * i.qtd; }, 0);
      var desconto = rnd() < 0.25 ? Math.round(total * 0.05) : 0;
      total -= desconto;
      var forma = escolher(formas);
      var hora = (9 + Math.floor(rnd() * 8)) + ':' + (rnd() < 0.5 ? '15' : '40');
      vendas.push({
        id: 'v' + numero, numero: numero++, dia: dia(d), hora: hora.length === 4 ? '0' + hora : hora,
        clienteId: rnd() < 0.7 ? escolher(clientes).id : null, vendedorId: escolher(vendedores),
        itens: itens, descontoCentavos: desconto, totalCentavos: total,
        pagamentos: [{ forma: forma, valor: total, parcelas: forma === 'credito' ? escolher([1, 2, 3, 5, 10]) : 1 }]
      });
    }
  }
  // Vendas de hoje, escritas à mão para a história da demonstração fazer sentido.
  vendas.push(
    { id: 'v' + numero, numero: numero++, dia: HOJE, hora: '09:20', clienteId: 'c07', vendedorId: 'u2', itens: [{ produtoId: 'o10', qtd: 2, precoCentavos: precoDe.o10 }, { produtoId: 'o11', qtd: 1, precoCentavos: precoDe.o11 }], descontoCentavos: 0, totalCentavos: 2 * precoDe.o10 + precoDe.o11, pagamentos: [{ forma: 'pix', valor: 2 * precoDe.o10 + precoDe.o11, parcelas: 1 }] },
    { id: 'v' + numero, numero: numero++, dia: HOJE, hora: '10:05', clienteId: 'c10', vendedorId: 'u1', itens: [{ produtoId: 'j10', qtd: 1, precoCentavos: precoDe.j10 }], descontoCentavos: 0, totalCentavos: precoDe.j10, pagamentos: [{ forma: 'credito', valor: precoDe.j10, parcelas: 3 }] },
    { id: 'v' + numero, numero: numero++, dia: HOJE, hora: '11:30', clienteId: null, vendedorId: 'u2', itens: [{ produtoId: 'j05', qtd: 1, precoCentavos: precoDe.j05 }], descontoCentavos: 0, totalCentavos: precoDe.j05, pagamentos: [{ forma: 'dinheiro', valor: precoDe.j05, parcelas: 1 }] }
  );

  var orcamentos = [
    { id: 'q201', numero: 201, clienteId: 'c05', vendedorId: 'u2', criado: dia(-6), validade: dia(1), itens: [{ produtoId: 'j02', qtd: 1, precoCentavos: precoDe.j02 }, { produtoId: 's02', qtd: 2, precoCentavos: precoDe.s02 }], descontoCentavos: 0, status: 'aberto', notas: 'Gravar data do casamento nas duas.' },
    { id: 'q202', numero: 202, clienteId: 'c12', vendedorId: 'u3', criado: dia(-3), validade: dia(5), itens: [{ produtoId: 'o08', qtd: 1, precoCentavos: precoDe.o08 }, { produtoId: 'o02', qtd: 1, precoCentavos: precoDe.o02 }], descontoCentavos: R(100), status: 'aberto', notas: 'Precisa renovar a receita antes.' },
    { id: 'q203', numero: 203, clienteId: 'c06', vendedorId: 'u1', criado: dia(-12), validade: dia(-2), itens: [{ produtoId: 'j06', qtd: 1, precoCentavos: precoDe.j06 }, { produtoId: 'j07', qtd: 1, precoCentavos: precoDe.j07 }], descontoCentavos: 0, status: 'aberto', notas: 'Presente de aniversário de casamento.' }
  ];

  var pedidos = [
    { id: 'p1042', numero: 1042, tipo: 'otica', clienteId: 'c01', descricao: 'Multifocal digital 1.60 + armação tartaruga', etapa: 'laboratorio', criado: dia(-9), prazo: dia(-2), parceiro: 'Laboratório Visão Norte', valorCentavos: R(1979) },
    { id: 'p1045', numero: 1045, tipo: 'otica', clienteId: 'c16', descricao: 'Multifocal digital 1.60 + armação metal', etapa: 'montagem', criado: dia(-6), prazo: dia(1), parceiro: 'Laboratório Visão Norte', valorCentavos: R(1910) },
    { id: 'p1047', numero: 1047, tipo: 'otica', clienteId: 'c13', descricao: 'Visão simples 1.67 filtro azul + armação acetato', etapa: 'pronto', criado: dia(-8), prazo: dia(-1), parceiro: 'Laboratório Visão Norte', valorCentavos: R(1179) },
    { id: 'p1049', numero: 1049, tipo: 'otica', clienteId: 'c09', descricao: 'Infantil TR90 + visão simples 1.56 (Lívia)', etapa: 'recebido', criado: dia(-1), prazo: dia(6), parceiro: 'Laboratório Visão Norte', valorCentavos: R(549) },
    { id: 'p1050', numero: 1050, tipo: 'otica', clienteId: 'c04', descricao: 'Troca de lentes: visão simples 1.56 AR', etapa: 'conferencia', criado: dia(-5), prazo: dia(0), parceiro: 'Laboratório Visão Norte', valorCentavos: R(290) },
    { id: 'p1043', numero: 1043, tipo: 'joia', clienteId: 'c06', descricao: 'Ajuste de aro: anel de formatura, 16 para 18', etapa: 'execucao', criado: dia(-3), prazo: dia(1), parceiro: 'Bancada própria', valorCentavos: R(80) },
    { id: 'p1044', numero: 1044, tipo: 'joia', clienteId: 'c14', descricao: 'Gravação a laser: "R & M 12.12" em aliança', etapa: 'pronto', criado: dia(-4), prazo: dia(-1), parceiro: 'Bancada própria', valorCentavos: R(60) },
    { id: 'p1046', numero: 1046, tipo: 'joia', clienteId: 'c05', descricao: 'Encomenda: par de alianças anatômicas com gravação', etapa: 'avaliacao', criado: dia(-2), prazo: dia(20), parceiro: 'Ourivesaria parceira', valorCentavos: R(4100) },
    { id: 'p1048', numero: 1048, tipo: 'joia', clienteId: 'c15', descricao: 'Banho de ródio em anel ouro branco', etapa: 'aprovado', criado: dia(-1), prazo: dia(3), parceiro: 'Bancada própria', valorCentavos: R(120) },
    { id: 'p1051', numero: 1051, tipo: 'joia', clienteId: 'c03', descricao: 'Conserto do fecho de colar veneziana', etapa: 'recebido', criado: dia(0), prazo: dia(4), parceiro: 'Bancada própria', valorCentavos: R(70) },
    { id: 'p1038', numero: 1038, tipo: 'otica', clienteId: 'c08', descricao: 'Óculos de sol com grau 1.56', etapa: 'entregue', criado: dia(-15), prazo: dia(-7), parceiro: 'Laboratório Visão Norte', valorCentavos: R(689) },
    { id: 'p1039', numero: 1039, tipo: 'joia', clienteId: 'c11', descricao: 'Limpeza e polimento de anel', etapa: 'entregue', criado: dia(-10), prazo: dia(-10), parceiro: 'Bancada própria', valorCentavos: R(50) }
  ];

  var financeiro = [
    { id: 'f01', tipo: 'receber', descricao: 'Crediário · alianças · parcela 2/4', clienteId: 'c02', vencimento: dia(-5), valorCentavos: R(330), status: 'aberto' },
    { id: 'f02', tipo: 'receber', descricao: 'Crediário · alianças · parcela 3/4', clienteId: 'c02', vencimento: dia(25), valorCentavos: R(330), status: 'aberto' },
    { id: 'f03', tipo: 'receber', descricao: 'Crediário · multifocal · parcela 1/3', clienteId: 'c16', vencimento: dia(0), valorCentavos: R(637), status: 'aberto' },
    { id: 'f04', tipo: 'receber', descricao: 'Crediário · multifocal · parcela 2/3', clienteId: 'c16', vencimento: dia(30), valorCentavos: R(637), status: 'aberto' },
    { id: 'f05', tipo: 'receber', descricao: 'Crediário · anel · parcela 1/2', clienteId: 'c15', vencimento: dia(12), valorCentavos: R(445), status: 'aberto' },
    { id: 'f06', tipo: 'receber', descricao: 'Crediário · alianças · parcela 1/4', clienteId: 'c02', vencimento: dia(-35), valorCentavos: R(330), status: 'pago', pagoEm: dia(-34), forma: 'pix' },
    { id: 'f07', tipo: 'receber', descricao: 'Saldo do pedido 1046 (encomenda)', clienteId: 'c05', vencimento: dia(20), valorCentavos: R(2050), status: 'aberto' },
    { id: 'f11', tipo: 'pagar', descricao: 'Laboratório Visão Norte · lentes do mês', vencimento: dia(2), valorCentavos: R(2380), status: 'aberto' },
    { id: 'f12', tipo: 'pagar', descricao: 'Ourivesaria parceira · metal e feitio', vencimento: dia(6), valorCentavos: R(6900), status: 'aberto' },
    { id: 'f13', tipo: 'pagar', descricao: 'Aluguel da loja', vencimento: dia(10), valorCentavos: R(3500), status: 'aberto' },
    { id: 'f14', tipo: 'pagar', descricao: 'Embalagens e estojos', vencimento: dia(4), valorCentavos: R(380), status: 'aberto' },
    { id: 'f15', tipo: 'pagar', descricao: 'Energia elétrica', vencimento: dia(-3), valorCentavos: R(640), status: 'pago', pagoEm: dia(-3), forma: 'pix' }
  ];

  var agenda = [
    { id: 'a01', dia: dia(0), inicio: '09:30', fim: '10:00', tipo: 'retirada', titulo: 'Retirada de óculos', clienteId: 'c13', responsavelId: 'u2' },
    { id: 'a02', dia: dia(0), inicio: '11:00', fim: '11:45', tipo: 'prova', titulo: 'Prova de alianças', clienteId: 'c05', responsavelId: 'u2' },
    { id: 'a03', dia: dia(0), inicio: '14:30', fim: '15:15', tipo: 'consulta', titulo: 'Exame de vista (parceira)', clienteId: 'c04', responsavelId: 'u3' },
    { id: 'a04', dia: dia(0), inicio: '16:00', fim: '16:20', tipo: 'retirada', titulo: 'Retirada da aliança gravada', clienteId: 'c14', responsavelId: 'u1' },
    { id: 'a05', dia: dia(1), inicio: '10:00', fim: '10:30', tipo: 'ajuste', titulo: 'Ajuste de armação', clienteId: 'c07', responsavelId: 'u3' },
    { id: 'a06', dia: dia(1), inicio: '15:00', fim: '15:30', tipo: 'entrega', titulo: 'Entrega do anel ajustado', clienteId: 'c06', responsavelId: 'u1' },
    { id: 'a07', dia: dia(2), inicio: '09:00', fim: '09:45', tipo: 'consulta', titulo: 'Exame de vista (parceira)', clienteId: 'c12', responsavelId: 'u3' },
    { id: 'a08', dia: dia(3), inicio: '17:00', fim: '17:40', tipo: 'fornecedor', titulo: 'Visita da ourivesaria parceira', clienteId: null, responsavelId: 'u1' },
    { id: 'a09', dia: dia(-1), inicio: '10:30', fim: '11:00', tipo: 'consulta', titulo: 'Orçamento de multifocal', clienteId: 'c16', responsavelId: 'u3' },
    { id: 'a10', dia: dia(4), inicio: '11:30', fim: '12:00', tipo: 'retorno', titulo: 'Retorno de adaptação ao multifocal', clienteId: 'c01', responsavelId: 'u3' },
    { id: 'a11', dia: dia(2), inicio: '13:30', fim: '14:00', tipo: 'retirada', titulo: 'Retirada do ródio', clienteId: 'c15', responsavelId: 'u2' }
  ];

  return {
    hoje: HOJE, loja: loja, equipe: equipe, perfis: perfis, produtos: produtos, clientes: clientes,
    vendas: vendas, orcamentos: orcamentos, pedidos: pedidos, financeiro: financeiro, agenda: agenda,
    proximoNumero: { venda: numero, pedido: 1052, orcamento: 204 }
  };
});
