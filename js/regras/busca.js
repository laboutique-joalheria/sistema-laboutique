/* Busca que perdoa: sem acento, qualquer ordem, plural simples e um erro de digitação.
   Também acha telefone por qualquer trecho de dígitos. O sistema antigo fazia JSON.stringify
   do registro inteiro a cada tecla, então "ouro" achava qualquer campo interno com "ouro". */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Busca = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VAZIAS = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, com: 1, para: 1, pra: 1, a: 1, o: 1, um: 1, uma: 1 };
  var SINONIMOS = {
    oculos: 'armacao', armacoes: 'armacao', lente: 'lente', lentes: 'lente', joia: 'joia', joias: 'joia',
    alianca: 'alianca', aliancas: 'alianca', brinco: 'brinco', brincos: 'brinco', relogio: 'relogio',
    sol: 'solar', solar: 'solar', grau: 'lente', corrente: 'colar', cordao: 'colar', gargantilha: 'colar'
  };

  function normalizar(t) {
    return String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9.,\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function singular(p) {
    if (p.length > 4 && /oes$/.test(p)) return p.slice(0, -3) + 'ao';
    if (p.length > 4 && /aes$/.test(p)) return p.slice(0, -3) + 'ao';
    if (p.length > 4 && /is$/.test(p) && !/sis$/.test(p)) return p.slice(0, -2) + 'l';
    if (p.length > 3 && /s$/.test(p) && !/ss$/.test(p)) return p.slice(0, -1);
    return p;
  }

  function termos(t) {
    return normalizar(t).split(' ').filter(function (p) { return p && !VAZIAS[p]; })
      .map(function (p) { return SINONIMOS[p] || singular(p); });
  }

  /* Distância de Damerau-Levenshtein com teto: para cedo quando já passou do limite. */
  function distancia(a, b, teto) {
    if (Math.abs(a.length - b.length) > teto) return teto + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      var menor = Infinity;
      for (j = 1; j <= b.length; j++) {
        var custo = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < menor) menor = d[i][j];
      }
      if (menor > teto) return teto + 1;
    }
    return d[a.length][b.length];
  }

  /* Pontua um termo contra as palavras de um campo. Começo do campo > começo de palavra > dentro > parecido. */
  function pontuarTermo(termo, campo, palavras) {
    if (!campo) return 0;
    if (campo.indexOf(termo) === 0) return 10;
    for (var i = 0; i < palavras.length; i++) if (palavras[i].indexOf(termo) === 0) return 7;
    if (termo.length >= 3 && campo.indexOf(termo) >= 0) return 4;
    if (termo.length >= 4) {
      var teto = termo.length >= 7 ? 2 : 1;
      for (var k = 0; k < palavras.length; k++) {
        var w = palavras[k].slice(0, termo.length + 1);
        if (distancia(termo, w.slice(0, termo.length), teto) <= teto || distancia(termo, palavras[k], teto) <= teto) return 2;
      }
    }
    return 0;
  }

  /* campos: [{ chave, peso }]. Todos os termos precisam casar em algum campo. */
  function buscar(itens, consulta, campos, limite) {
    var ts = termos(consulta);
    var digitos = String(consulta || '').replace(/\D/g, '');
    if (!ts.length && digitos.length < 3) return [];
    var cache = itens.map(function (item) {
      return campos.map(function (c) {
        var v = typeof c.chave === 'function' ? c.chave(item) : item[c.chave];
        var n = normalizar(v);
        return { n: n, palavras: n.split(' ').map(singular), peso: c.peso || 1, digitos: c.telefone ? String(v || '').replace(/\D/g, '') : '' };
      });
    });
    var res = [];
    itens.forEach(function (item, idx) {
      var total = 0, ok = true;
      var porTelefone = digitos.length >= 4 && cache[idx].some(function (c) { return c.digitos && c.digitos.indexOf(digitos) >= 0; });
      if (porTelefone) { res.push({ item: item, pontos: 50 }); return; }
      for (var t = 0; t < ts.length && ok; t++) {
        var melhor = 0;
        for (var c = 0; c < cache[idx].length; c++) {
          var p = pontuarTermo(ts[t], cache[idx][c].n, cache[idx][c].palavras) * cache[idx][c].peso;
          if (p > melhor) melhor = p;
        }
        if (!melhor) ok = false; else total += melhor;
      }
      if (ok && ts.length) res.push({ item: item, pontos: total });
    });
    res.sort(function (a, b) { return b.pontos - a.pontos; });
    return res.slice(0, limite || 50).map(function (r) { return r.item; });
  }

  return { normalizar: normalizar, termos: termos, distancia: distancia, buscar: buscar, singular: singular };
});
