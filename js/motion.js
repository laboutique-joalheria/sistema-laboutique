/* Movimento do Lapidar.
   Efeito-assinatura: um brilhante lapidado em 3D, desenhado em canvas 2D (sem biblioteca).
   "Lapidar" vale para os dois lados do negócio: lapida-se a pedra na joalheria e a lente na ótica.
   Por isso a gema também separa a luz em espectro, como um prisma.
   Regras: só anima com html.efeitos-on; para fora da tela e com a aba escondida; sem efeitos,
   desenha uma pose parada bonita. */
(function (root) {
  'use strict';
  var doc = document.documentElement;
  var reduzido = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');
  var ponteiroFino = root.matchMedia && root.matchMedia('(hover: hover) and (pointer: fine)');

  function ativo() { return doc.classList.contains('efeitos-on'); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function tokens() {
    var cs = getComputedStyle(doc);
    function v(n) { return cs.getPropertyValue(n).trim(); }
    return { ouro: v('--ouro'), safira: v('--safira'), ametista: v('--ametista'), fg: v('--fg'), bg: v('--bg'), escuro: (cs.colorScheme || v('color-scheme')).indexOf('dark') >= 0 };
  }

  /* ---------- geometria do brilhante (8 setores, 16 pontos de cintura) ---------- */
  function lapidar() {
    var N = 8, P = [], F = [];
    var ht = 0.34, rt = 0.54, rs = 0.79, ys = 0.19, pd = 0.86, rm = 0.36, ym = -0.58;
    function ponto(ang, r, y) { P.push([Math.cos(ang) * r, y, Math.sin(ang) * r]); return P.length - 1; }
    var a = function (k) { return k * Math.PI * 2 / N; };
    var T = [], S = [], G = [], M = [];
    for (var k = 0; k < N; k++) T.push(ponto(a(k), rt, ht));
    for (k = 0; k < N; k++) S.push(ponto(a(k) + Math.PI / N, rs, ys));
    for (var j = 0; j < N * 2; j++) G.push(ponto(j * Math.PI / N, 1, 0));
    for (k = 0; k < N; k++) M.push(ponto(a(k), rm, ym));
    var C = ponto(0, 0, -pd);
    var m = function (i, n) { return ((i % n) + n) % n; };
    F.push({ v: T.slice().reverse(), parte: 'mesa' });
    for (k = 0; k < N; k++) {
      F.push({ v: [T[k], S[k], T[m(k + 1, N)]], parte: 'estrela' });
      F.push({ v: [T[k], S[m(k - 1, N)], G[2 * k], S[k]], parte: 'bezel' });
      F.push({ v: [S[k], G[2 * k], G[2 * k + 1]], parte: 'cintura' });
      F.push({ v: [S[k], G[2 * k + 1], G[m(2 * k + 2, 2 * N)]], parte: 'cintura' });
      F.push({ v: [G[2 * k], M[k], G[2 * k + 1]], parte: 'pavilhao' });
      F.push({ v: [G[2 * k + 1], M[k], M[m(k + 1, N)]], parte: 'pavilhao' });
      F.push({ v: [G[2 * k + 1], M[m(k + 1, N)], G[m(2 * k + 2, 2 * N)]], parte: 'pavilhao' });
      F.push({ v: [M[k], C, M[m(k + 1, N)]], parte: 'principal' });
    }
    // Direção de "voo" de cada faceta na montagem: para fora do centro, com sorteio fixo.
    var semente = 7;
    function rnd() { semente = (semente * 16807) % 2147483647; return semente / 2147483647; }
    F.forEach(function (f) {
      var cx = 0, cy = 0, cz = 0;
      f.v.forEach(function (i) { cx += P[i][0]; cy += P[i][1]; cz += P[i][2]; });
      var n = f.v.length; cx /= n; cy /= n; cz /= n;
      var len = Math.hypot(cx, cy, cz) || 1;
      f.centro = [cx, cy, cz];
      f.voo = [cx / len, cy / len + (rnd() - .5) * .6, cz / len];
      f.dist = 1.4 + rnd() * 2.2;
      f.atraso = rnd() * 0.35;
      f.giro = (rnd() - .5) * 2.5;
    });
    return { P: P, F: F };
  }
  var MALHA = lapidar();

  function girar(p, ay, ax) {
    var x = p[0], y = p[1], z = p[2];
    var c = Math.cos(ay), s = Math.sin(ay);
    var x1 = x * c + z * s, z1 = -x * s + z * c;
    var c2 = Math.cos(ax), s2 = Math.sin(ax);
    return [x1, y * c2 - z1 * s2, y * s2 + z1 * c2];
  }

  function hexRgb(h) {
    h = (h || '#ffffff').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }

  /* ---------- a gema ---------- */
  function Gema(canvas, opcoes) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.o = Object.assign({ escala: 0.36, raios: false, montar: true, giro: 0.32, inclinacao: -0.42 }, opcoes || {});
    this.t0 = performance.now();
    this.ang = 0.35;
    this.alvo = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };
    this.visivel = true;
    this.cores = tokens();
    var self = this;
    this.medir();
    this.ro = new ResizeObserver(function () { self.medir(); if (!self.rodando) self.desenhar(performance.now()); });
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(function (es) { self.visivel = es[0].isIntersecting; self.agendar(); });
    this.io.observe(canvas);
    this.mover = function (e) {
      var r = canvas.getBoundingClientRect();
      self.alvo.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 1.4)));
      self.alvo.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 1.4)));
    };
    if (ponteiroFino && ponteiroFino.matches) root.addEventListener('pointermove', this.mover, { passive: true });
    if (!this.o.montar) this.t0 -= 5000;
    this.agendar();
  }
  Gema.prototype.medir = function () {
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    var w = this.c.clientWidth || 200, h = this.c.clientHeight || 200;
    this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    this.w = w; this.h = h; this.dpr = dpr;
    // Posição e tamanho da pedra podem depender da largura (ex.: entrada no celular).
    if (this.o.layout) Object.assign(this.o, this.o.layout(w, h));
  };
  Gema.prototype.agendar = function () {
    var self = this;
    var deve = ativo() && this.visivel && !document.hidden && !this.morta;
    if (deve && !this.rodando) {
      this.rodando = true;
      var passo = function (t) {
        if (!self.rodando) return;
        self.desenhar(t);
        self.raf = requestAnimationFrame(passo);
      };
      this.raf = requestAnimationFrame(passo);
    } else if (!deve && this.rodando) {
      this.rodando = false;
      cancelAnimationFrame(this.raf);
    }
    if (!deve) this.desenhar(performance.now(), true);
  };
  Gema.prototype.destruir = function () {
    this.morta = true; this.rodando = false; cancelAnimationFrame(this.raf);
    this.ro.disconnect(); this.io.disconnect();
    root.removeEventListener('pointermove', this.mover);
  };
  Gema.prototype.retema = function () { this.cores = tokens(); if (!this.rodando) this.desenhar(performance.now(), true); };

  Gema.prototype.desenhar = function (agora, parado) {
    var g = this.g, w = this.w, h = this.h, dpr = this.dpr;
    var cores = this.cores;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    var tempo = (agora - this.t0) / 1000;
    var montagem = parado ? 1 : Math.min(1, tempo / 1.7);
    if (parado) { this.ang = 0.35; this.mouse.x = 0; this.mouse.y = 0; }
    else {
      // O valor desenhado persegue o alvo com amortecimento: nada de saltos.
      this.mouse.x += (this.alvo.x - this.mouse.x) * 0.06;
      this.mouse.y += (this.alvo.y - this.mouse.y) * 0.06;
      this.ang += this.o.giro / 60 * (montagem < 1 ? 2.2 - montagem * 1.2 : 1);
    }
    var cx = w * (this.o.cx || 0.5), cy = h * (this.o.cy || 0.5);
    var R = Math.min(w, h) * this.o.escala;
    var ay = this.ang + this.mouse.x * 0.6;
    var ax = this.o.inclinacao + this.mouse.y * 0.35;

    if (this.o.raios) this.raios(g, cx, cy, R, tempo, montagem, cores);

    var P = MALHA.P, faces = [];
    var claro = !cores.escuro;
    for (var i = 0; i < MALHA.F.length; i++) {
      var f = MALHA.F[i];
      // Cada faceta tem um pequeno atraso: a pedra se forma em ondas, não de uma vez.
      var local = Math.max(0, Math.min(1, (montagem - f.atraso * 0.5) / (1 - f.atraso * 0.5)));
      var e = easeOut(montagem >= 1 ? 1 : local);
      var d = (1 - e) * f.dist;
      var giroF = (1 - e) * f.giro;
      var pts = f.v.map(function (idx) {
        var p = P[idx];
        // faceta gira em torno do próprio centro enquanto voa para o lugar
        var rel = [p[0] - f.centro[0], p[1] - f.centro[1], p[2] - f.centro[2]];
        var r = girar(rel, giroF, giroF * 0.6);
        var q = [r[0] + f.centro[0] + f.voo[0] * d, r[1] + f.centro[1] + f.voo[1] * d, r[2] + f.centro[2] + f.voo[2] * d];
        return girar(q, ay, ax);
      });
      // normal
      var a = pts[0], b = pts[1], c = pts[2];
      var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      var zm = 0; pts.forEach(function (p) { zm += p[2]; }); zm /= pts.length;
      faces.push({ pts: pts, n: [nx, ny, nz], z: zm, parte: f.parte, alfa: e });
    }
    faces.sort(function (p, q) { return p.z - q.z; });

    var luz = [-0.45, 0.75, 0.5]; var ll = Math.hypot(luz[0], luz[1], luz[2]); luz = luz.map(function (x) { return x / ll; });
    var ouro = hexRgb(cores.ouro), saf = hexRgb(cores.safira), ame = hexRgb(cores.ametista);
    var persp = 3.2;
    g.lineJoin = 'round';
    for (var k = 0; k < faces.length; k++) {
      var fc = faces[k];
      var frente = fc.n[2] < 0; // câmera olha para +z
      var difusa = Math.max(0, -(fc.n[0] * luz[0] + fc.n[1] * -luz[1] + fc.n[2] * -luz[2]));
      // "Fogo": matiz muda com a orientação da faceta e com o tempo, como dispersão da luz.
      var fase = Math.atan2(fc.n[0], fc.n[2]) * 1.6 + fc.n[1] * 2.2 + tempo * 0.35;
      var mixA = (Math.sin(fase) + 1) / 2, mixB = (Math.sin(fase * 1.7 + 2) + 1) / 2;
      var base = [
        saf[0] * mixA + ame[0] * (1 - mixA),
        saf[1] * mixA + ame[1] * (1 - mixA),
        saf[2] * mixA + ame[2] * (1 - mixA)
      ];
      if (fc.parte === 'mesa' || fc.parte === 'estrela') base = base.map(function (x, i) { return x * (1 - mixB * 0.5) + ouro[i] * mixB * 0.5; });
      var brilho = Math.pow(difusa, 3) * (claro ? 0.55 : 0.85);
      var cor = base.map(function (x) { return Math.round(Math.min(255, x * (claro ? 0.62 + difusa * 0.35 : 0.38 + difusa * 0.55) + 255 * brilho)); });
      var alfaF = (frente ? (claro ? 0.8 : 0.72) : (claro ? 0.16 : 0.22)) * fc.alfa;
      g.beginPath();
      fc.pts.forEach(function (p, i) {
        var s = persp / (persp + p[2]);
        var X = cx + p[0] * R * s, Y = cy - p[1] * R * s;
        if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
      });
      g.closePath();
      g.fillStyle = 'rgba(' + cor[0] + ',' + cor[1] + ',' + cor[2] + ',' + alfaF.toFixed(3) + ')';
      g.fill();
      g.strokeStyle = claro ? 'rgba(30,40,70,' + (frente ? 0.35 : 0.1) * fc.alfa + ')' : 'rgba(255,255,255,' + (frente ? 0.42 : 0.1) * fc.alfa + ')';
      g.lineWidth = frente ? 0.9 : 0.6;
      g.stroke();
    }
    // Cintilação: uma estrela de luz que passa pela mesa de tempos em tempos.
    if (!parado && montagem >= 1) {
      var ciclo = (tempo % 4.5) / 4.5;
      if (ciclo < 0.18) {
        var it = Math.sin(ciclo / 0.18 * Math.PI);
        var sx = cx - R * 0.25, sy = cy - R * 0.38;
        g.save();
        g.globalCompositeOperation = claro ? 'source-over' : 'lighter';
        g.strokeStyle = 'rgba(255,255,255,' + (0.85 * it) + ')';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(sx - R * 0.22 * it, sy); g.lineTo(sx + R * 0.22 * it, sy);
        g.moveTo(sx, sy - R * 0.22 * it); g.lineTo(sx, sy + R * 0.22 * it);
        g.stroke();
        g.restore();
      }
    }
  };

  /* Feixe branco entra pela esquerda, atravessa a gema e sai em espectro. */
  Gema.prototype.raios = function (g, cx, cy, R, tempo, montagem, cores) {
    var w = this.w, h = this.h;
    var claro = !cores.escuro;
    var forca = easeOut(Math.min(1, Math.max(0, (montagem - 0.55) / 0.45)));
    if (forca <= 0) return;
    g.save();
    g.globalCompositeOperation = claro ? 'multiply' : 'lighter';
    var entrada = g.createLinearGradient(0, cy, cx, cy);
    entrada.addColorStop(0, 'rgba(255,255,255,0)');
    entrada.addColorStop(1, claro ? 'rgba(120,130,160,' + 0.35 * forca + ')' : 'rgba(255,255,255,' + 0.5 * forca + ')');
    g.strokeStyle = entrada; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, cy + R * 0.9); g.lineTo(cx - R * 0.2, cy + R * 0.05); g.stroke();
    var espectro = [[255, 80, 90], [255, 160, 70], [250, 220, 90], [90, 220, 150], [90, 170, 255], [170, 120, 255]];
    for (var i = 0; i < espectro.length; i++) {
      var ang = -0.32 + i * 0.1 + Math.sin(tempo * 0.6 + i) * 0.012;
      var comp = Math.max(w, h) * 1.1;
      var x2 = cx + Math.cos(ang) * comp, y2 = cy + Math.sin(ang) * comp;
      var gr = g.createLinearGradient(cx, cy, x2, y2);
      var c = espectro[i], a = (claro ? 0.22 : 0.3) * forca;
      gr.addColorStop(0, 'rgba(' + c + ',' + a + ')');
      gr.addColorStop(1, 'rgba(' + c + ',0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(cx + R * 0.2, cy);
      g.lineTo(x2, y2 - 18); g.lineTo(x2, y2 + 18);
      g.closePath(); g.fill();
    }
    g.restore();
  };

  /* ---------- explosão de facetas no sucesso da venda ---------- */
  function sucesso(canvas) {
    var gema = new Gema(canvas, { escala: 0.26, giro: 2.6, montar: true });
    if (!ativo()) return gema;
    var g = canvas.getContext('2d');
    var cores = tokens();
    var paleta = [cores.ouro, cores.safira, cores.ametista, cores.ouro];
    var parts = [];
    for (var i = 0; i < 46; i++) {
      var a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 3.2;
      parts.push({ x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, r: 3 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, cor: paleta[i % paleta.length] });
    }
    var desenharOriginal = gema.desenhar.bind(gema);
    var inicio = performance.now();
    gema.desenhar = function (agora, parado) {
      desenharOriginal(agora, parado);
      var t = (agora - inicio) / 1000;
      if (t > 1.6) { gema.o.giro = 0.5; return; }
      gema.o.giro = 2.6 - t * 1.3;
      var w = gema.w, h = gema.h;
      g.save();
      g.translate(w / 2, h / 2);
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.rot += p.vr;
        var al = Math.max(0, 1 - t / 1.4);
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.globalAlpha = al; g.fillStyle = p.cor;
        g.beginPath(); g.moveTo(0, -p.r); g.lineTo(p.r * .7, 0); g.lineTo(0, p.r); g.lineTo(-p.r * .7, 0); g.closePath(); g.fill();
        g.restore();
      });
      g.restore();
    };
    return gema;
  }

  /* ---------- revelar ao rolar ---------- */
  var obsRevelar = 'IntersectionObserver' in root ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('revelado'); obsRevelar.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function revelar(raiz) {
    var alvos = (raiz || document).querySelectorAll('[data-revelar]:not(.revelado)');
    alvos.forEach(function (el) { if (obsRevelar && ativo()) obsRevelar.observe(el); else el.classList.add('revelado'); });
  }

  /* ---------- inclinação com luz seguindo o ponteiro (só mouse) ---------- */
  function inclinar(raiz) {
    if (!(ponteiroFino && ponteiroFino.matches)) return;
    (raiz || document).querySelectorAll('[data-inclinar]').forEach(function (el) {
      if (el.dataset.inclinarOk) return;
      el.dataset.inclinarOk = '1';
      el.addEventListener('pointermove', function (e) {
        if (!ativo()) return;
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((px - .5) * 8).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((.5 - py) * 8).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        el.classList.add('inclinando');
      });
      el.addEventListener('pointerleave', function () { el.classList.remove('inclinando'); });
    });
  }

  /* ---------- números que contam ---------- */
  function contar(raiz, formatar) {
    (raiz || document).querySelectorAll('[data-contar]').forEach(function (el) {
      var alvo = Number(el.dataset.contar), moeda = el.dataset.formato === 'moeda';
      var fmt = function (v) { return moeda ? formatar(Math.round(v)) : String(Math.round(v)); };
      if (!ativo() || (reduzido && reduzido.matches)) { el.textContent = fmt(alvo); return; }
      var t0 = performance.now(), dur = 900;
      (function passo(t) {
        var p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt(alvo * easeOut(p));
        if (p < 1) requestAnimationFrame(passo);
      })(t0);
    });
  }

  /* ---------- botão magnético ---------- */
  function magnetico(el) {
    if (!el || !(ponteiroFino && ponteiroFino.matches)) return;
    el.addEventListener('pointermove', function (e) {
      if (!ativo()) return;
      var r = el.getBoundingClientRect();
      el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.14).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.22).toFixed(1) + 'px)';
    });
    el.addEventListener('pointerleave', function () { el.style.transform = ''; });
  }

  /* FLIP: cartão que muda de coluna desliza até o novo lugar. */
  function flip(el, antes) {
    if (!el || !antes || !ativo()) return;
    var depois = el.getBoundingClientRect();
    var dx = antes.left - depois.left, dy = antes.top - depois.top;
    if (!dx && !dy) return;
    el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.02)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
  }

  root.Motion = { Gema: Gema, sucesso: sucesso, revelar: revelar, inclinar: inclinar, contar: contar, magnetico: magnetico, flip: flip, ativo: ativo };
})(typeof self !== 'undefined' ? self : this);
