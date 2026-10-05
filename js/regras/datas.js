/* Datas civis no fuso da loja. O sistema antigo usava toISOString(), que entrega o dia em UTC:
   depois das 21h em Ijuí (UTC−3) o filtro "até hoje" já virava amanhã. Aqui a data é sempre a do relógio da loja. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Datas = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var FUSO = 'America/Sao_Paulo'; // Ijuí (RS) segue o horário de Brasília

  /* 'AAAA-MM-DD' do instante informado, no fuso da loja. */
  function diaCivil(instante, fuso) {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: fuso || FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(instante || new Date());
    var o = {};
    p.forEach(function (x) { o[x.type] = x.value; });
    return o.year + '-' + o.month + '-' + o.day;
  }

  function hoje(fuso) { return diaCivil(new Date(), fuso); }

  function paraUTC(dia) {
    var p = String(dia).split('-').map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2]);
  }

  /* Soma dias em data civil, sem horário de verão nem fuso entrando na conta. */
  function somarDias(dia, n) {
    var d = new Date(paraUTC(dia) + n * 86400000);
    return d.toISOString().slice(0, 10);
  }

  function diferencaDias(de, ate) {
    return Math.round((paraUTC(ate) - paraUTC(de)) / 86400000);
  }

  function somarMeses(dia, n) {
    var p = String(dia).split('-').map(Number);
    var alvo = new Date(Date.UTC(p[0], p[1] - 1 + n, 1));
    var ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
    alvo.setUTCDate(Math.min(p[2], ultimo)); // 31/01 + 1 mês = 28 ou 29/02, não 03/03
    return alvo.toISOString().slice(0, 10);
  }

  function diaDaSemana(dia) { return new Date(paraUTC(dia)).getUTCDay(); }

  /* Segunda-feira da semana do dia (agenda começa na segunda, como a loja trabalha). */
  function inicioDaSemana(dia) {
    var w = diaDaSemana(dia);
    return somarDias(dia, w === 0 ? -6 : 1 - w);
  }

  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  function curta(dia) {
    var p = String(dia).split('-');
    return p[2] + '/' + p[1];
  }
  function porExtenso(dia) {
    var p = String(dia).split('-').map(Number);
    return SEMANA[diaDaSemana(dia)] + ', ' + p[2] + ' ' + MESES[p[1] - 1];
  }

  /* "hoje", "amanhã", "há 3 dias", "em 5 dias" — mais rápido de ler que uma data. */
  function relativo(dia, referencia) {
    var d = diferencaDias(referencia || hoje(), dia);
    if (d === 0) return 'hoje';
    if (d === 1) return 'amanhã';
    if (d === -1) return 'ontem';
    return d > 0 ? 'em ' + d + ' dias' : 'há ' + Math.abs(d) + ' dias';
  }

  /* Próximo aniversário (dias até), tratando 29/02 em ano comum como 28/02. */
  function diasAteAniversario(nascimento, referencia) {
    var ref = referencia || hoje();
    var ano = Number(ref.slice(0, 4));
    var md = nascimento.slice(5);
    function noAno(a) {
      var bissexto = (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
      return a + '-' + (md === '02-29' && !bissexto ? '02-28' : md);
    }
    var d = diferencaDias(ref, noAno(ano));
    if (d < 0) d = diferencaDias(ref, noAno(ano + 1));
    return d;
  }

  return {
    FUSO: FUSO, diaCivil: diaCivil, hoje: hoje, somarDias: somarDias, somarMeses: somarMeses,
    diferencaDias: diferencaDias, diaDaSemana: diaDaSemana, inicioDaSemana: inicioDaSemana,
    curta: curta, porExtenso: porExtenso, relativo: relativo, diasAteAniversario: diasAteAniversario,
    MESES: MESES, SEMANA: SEMANA
  };
});
