/* Sons sintetizados com Web Audio: nenhum arquivo para baixar.
   Só tocam depois do primeiro toque (regra dos navegadores), pausam com a aba escondida
   e ficam baixos. Para uso diário na loja, a recomendação é deixar desligado; na
   apresentação, ligado mostra o capricho. */
(function (root) {
  'use strict';
  var ctx = null, mestre = null, ruido = null;
  var ligado = true, volume = 0.6;
  try {
    var salvo = localStorage.getItem('lapidar.som');
    if (salvo === '0') ligado = false;
    var v = Number(localStorage.getItem('lapidar.volume'));
    if (v > 0 && v <= 1) volume = v;
  } catch (e) { /* armazenamento bloqueado: segue com o padrão */ }

  function iniciar() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    mestre = ctx.createGain();
    mestre.gain.value = 0.32 * volume;
    // Compressor evita pico quando dois sons coincidem (ex.: clique + sucesso).
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    mestre.connect(comp); comp.connect(ctx.destination);
    // Ruído marrom pré-gerado para os "sopros".
    var n = ctx.sampleRate * 1.2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0), ult = 0;
    for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; ult = (ult + 0.02 * w) / 1.02; d[i] = ult * 3.5; }
    ruido = buf;
    return ctx;
  }

  function tom(freq, inicio, dur, opts) {
    opts = opts || {};
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = opts.tipo || 'sine';
    o.frequency.setValueAtTime(freq, inicio);
    if (opts.para) o.frequency.exponentialRampToValueAtTime(opts.para, inicio + dur);
    var pico = opts.ganho || 0.5;
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(pico, inicio + (opts.ataque || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    o.connect(g); g.connect(opts.destino || mestre);
    o.start(inicio); o.stop(inicio + dur + 0.02);
  }

  function sopro(inicio, dur, de, ate, ganho) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruido;
    f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(de, inicio);
    f.frequency.exponentialRampToValueAtTime(ate, inicio + dur);
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(ganho || 0.5, inicio + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    s.connect(f); f.connect(g); g.connect(mestre);
    s.start(inicio); s.stop(inicio + dur + 0.05);
  }

  /* Brilho de gema: harmônicos altos e curtos, como cristal tocado de leve. */
  function cristal(freq, inicio, ganho) {
    tom(freq, inicio, 0.9, { ganho: ganho, ataque: 0.004 });
    tom(freq * 2.01, inicio, 0.5, { ganho: ganho * 0.35 });
    tom(freq * 3.98, inicio, 0.25, { ganho: ganho * 0.12 });
  }

  var receitas = {
    clique: function (t) { tom(320, t, 0.07, { para: 180, ganho: 0.35, tipo: 'triangle' }); },
    seta: function (t) { tom(880, t, 0.06, { para: 1180, ganho: 0.18, tipo: 'triangle' }); tom(1320, t + 0.03, 0.05, { ganho: 0.08 }); },
    setaVolta: function (t) { tom(1180, t, 0.06, { para: 820, ganho: 0.18, tipo: 'triangle' }); tom(660, t + 0.03, 0.05, { ganho: 0.08 }); },
    navegar: function (t) { sopro(t, 0.32, 600, 2400, 0.22); },
    abrir: function (t) { sopro(t, 0.28, 400, 1800, 0.2); tom(523, t + 0.05, 0.18, { ganho: 0.06 }); },
    fechar: function (t) { sopro(t, 0.24, 1800, 400, 0.16); },
    adicionar: function (t) { cristal(784, t, 0.2); cristal(1175, t + 0.08, 0.16); },
    remover: function (t) { tom(520, t, 0.12, { para: 300, ganho: 0.18, tipo: 'triangle' }); },
    alternar: function (t) { tom(660, t, 0.05, { ganho: 0.16, tipo: 'square' }); tom(990, t + 0.045, 0.05, { ganho: 0.1, tipo: 'square' }); },
    etapa: function (t) { sopro(t, 0.4, 300, 3200, 0.25); cristal(1046, t + 0.12, 0.08); },
    sucesso: function (t) { [523, 659, 784, 1046, 1318].forEach(function (f, i) { cristal(f, t + i * 0.075, 0.17 - i * 0.015); }); sopro(t, 0.6, 800, 5000, 0.12); },
    erro: function (t) { tom(196, t, 0.16, { ganho: 0.25, tipo: 'triangle' }); tom(174, t + 0.12, 0.2, { ganho: 0.2, tipo: 'triangle' }); },
    hover: function (t) { sopro(t, 0.12, 1800, 2600, 0.05); }
  };

  var ultimo = {};
  function tocar(nome) {
    if (!ligado || document.hidden) return;
    // Sem interação ainda, o navegador recusaria o áudio (e reclamaria no console).
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    if (!iniciar()) return;
    if (ctx.state === 'suspended') ctx.resume();
    var agora = ctx.currentTime;
    // Evita metralhadora de sons quando a pessoa segura uma tecla ou passa o mouse rápido.
    if (ultimo[nome] && agora - ultimo[nome] < (nome === 'clique' ? 0.15 : 0.045)) return;
    ultimo[nome] = agora;
    var r = receitas[nome];
    if (r) r(agora + 0.005);
  }

  function definir(on) {
    ligado = !!on;
    try { localStorage.setItem('lapidar.som', ligado ? '1' : '0'); } catch (e) {}
    if (ligado) tocar('alternar');
  }
  function definirVolume(v) {
    volume = Math.min(1, Math.max(0.05, v));
    try { localStorage.setItem('lapidar.volume', String(volume)); } catch (e) {}
    if (mestre) mestre.gain.value = 0.32 * volume;
  }

  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (ligado) ctx.resume();
  });

  root.Som = {
    tocar: tocar, definir: definir, definirVolume: definirVolume,
    get ligado() { return ligado; }, get volume() { return volume; }
  };
})(typeof self !== 'undefined' ? self : this);
