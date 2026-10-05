/* AGENDA: semana visual (no celular, lista do dia). Setas ‹ › trocam a semana, com som. */
(function (L) {
  'use strict';
  var esc = L.esc, ic = L.ic;
  var inicio = null, diaCelular = null;
  var H0 = 9, H1 = 19, ALT = 56; // 9h às 19h, 56 px por hora
  var TIPOS = { retirada: 'Retirada', prova: 'Prova', consulta: 'Exame de vista', ajuste: 'Ajuste', entrega: 'Entrega', retorno: 'Retorno', fornecedor: 'Fornecedor' };

  function minutos(h) { var p = h.split(':'); return Number(p[0]) * 60 + Number(p[1]); }

  function evento(a) {
    var c = a.clienteId && L.cli(a.clienteId);
    var top = (minutos(a.inicio) - H0 * 60) / 60 * ALT, alt = Math.max((minutos(a.fim) - minutos(a.inicio)) / 60 * ALT - 3, 28);
    return '<button class="evento" style="--cor:' + L.COR_AGENDA[a.tipo] + ';top:' + top + 'px;height:' + alt + 'px" data-evento="' + a.id + '"><strong>' + esc(a.inicio + ' ' + a.titulo) + '</strong><small>' + esc(c ? c.nome : 'Equipe') + '</small></button>';
  }

  function semana() {
    var dias = [];
    for (var i = 0; i < 7; i++) dias.push(Datas.somarDias(inicio, i));
    var agora = L.horaAgora(), mAgora = minutos(agora);
    var cab = '<div class="cab"></div>' + dias.map(function (d) { return '<div class="cab' + (d === L.hoje ? ' hoje' : '') + '"><small>' + Datas.SEMANA[Datas.diaDaSemana(d)] + '</small><strong>' + Number(d.slice(8)) + '</strong></div>'; }).join('');
    var horas = '<div class="horas">' + Array.from({ length: H1 - H0 }, function (_, i) { return '<span>' + (H0 + i) + 'h</span>'; }).join('') + '</div>';
    var cols = dias.map(function (d) {
      var evs = L.D.agenda.filter(function (a) { return a.dia === d; });
      var linhaAgora = d === L.hoje && mAgora >= H0 * 60 && mAgora <= H1 * 60 ? '<span class="agora" style="top:' + ((mAgora - H0 * 60) / 60 * ALT) + 'px" aria-label="Agora, ' + agora + '"></span>' : '';
      return '<div class="dia-col' + (d === L.hoje ? ' hoje' : '') + '">' + Array.from({ length: H1 - H0 }, function () { return '<i></i>'; }).join('') + evs.map(evento).join('') + linhaAgora + '</div>';
    }).join('');
    return '<div class="semana" role="grid" aria-label="Agenda da semana">' + cab + horas + cols + '</div>';
  }

  function listaDia() {
    var evs = L.D.agenda.filter(function (a) { return a.dia === diaCelular; }).sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; });
    return '<div class="dia-lista"><div class="agenda-barra"><button class="btn icone" data-dia-cel="-1" aria-label="Dia anterior" style="border:1px solid var(--line)">' + ic('esq') + '</button><h2 style="flex:1;text-align:center">' + esc(Datas.porExtenso(diaCelular)) + (diaCelular === L.hoje ? ' · hoje' : '') + '</h2><button class="btn icone" data-dia-cel="1" aria-label="Próximo dia" style="border:1px solid var(--line)">' + ic('dir') + '</button></div>' +
      (evs.length ? '<section class="painel"><ul class="linha-tempo">' + evs.map(function (a) { var c = a.clienteId && L.cli(a.clienteId); return '<li style="--cor:' + L.COR_AGENDA[a.tipo] + ';cursor:pointer" data-evento="' + a.id + '"><time>' + a.inicio + '</time><span class="ponto"></span><div><strong>' + esc(a.titulo) + '</strong><small>' + esc(c ? c.nome : 'Equipe') + ' · ' + TIPOS[a.tipo] + '</small></div></li>'; }).join('') + '</ul></section>'
        : '<div class="painel vazio"><p>Nada marcado neste dia.</p></div>') + '</div>';
  }

  L.telas.agenda = {
    titulo: 'Agenda',
    html: function () {
      if (!inicio) inicio = Datas.inicioDaSemana(L.hoje);
      if (!diaCelular) diaCelular = L.hoje;
      var fim = Datas.somarDias(inicio, 6);
      var legenda = Object.keys(TIPOS).map(function (k) { return '<span><i style="background:' + L.COR_AGENDA[k] + '"></i>' + TIPOS[k] + '</span>'; }).join('');
      return '<div class="cabeca"><div><h1>Agenda</h1><p>Retiradas, provas de aliança, exames de vista e entregas. Use as setas do teclado para trocar a semana.</p></div>' +
        '<div class="cabeca-acoes"><button class="btn ouro" data-novo-compromisso>' + ic('mais') + 'Novo compromisso</button></div></div>' +
        '<div class="agenda-barra some-celular-agenda"><button class="btn icone" data-semana="-1" aria-label="Semana anterior" style="border:1px solid var(--line)">' + ic('esq') + '</button>' +
        '<button class="btn sm" data-semana="0">Hoje</button><button class="btn icone" data-semana="1" aria-label="Próxima semana" style="border:1px solid var(--line)">' + ic('dir') + '</button>' +
        '<h2>' + Number(inicio.slice(8)) + ' ' + Datas.MESES[Number(inicio.slice(5, 7)) - 1] + ' – ' + Number(fim.slice(8)) + ' ' + Datas.MESES[Number(fim.slice(5, 7)) - 1] + '</h2>' +
        '<div class="legenda" style="margin-left:auto">' + legenda + '</div></div>' +
        semana() + listaDia();
    }
  };

  function mudarSemana(d) {
    inicio = d === 0 ? Datas.inicioDaSemana(L.hoje) : Datas.somarDias(inicio, d * 7);
    Som.tocar(d < 0 ? 'setaVolta' : 'seta');
    L.atualizar();
  }

  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-semana]'))) { mudarSemana(Number(t.dataset.semana)); return; }
    if ((t = e.target.closest('[data-dia-cel]'))) { var d = Number(t.dataset.diaCel); diaCelular = Datas.somarDias(diaCelular, d); Som.tocar(d < 0 ? 'setaVolta' : 'seta'); L.atualizar(); return; }
    if ((t = e.target.closest('[data-evento]'))) { abrirEvento(t.dataset.evento); return; }
    if (e.target.closest('[data-novo-compromisso]')) L.novoCompromisso({});
  });
  document.addEventListener('keydown', function (e) {
    if (L.E.rota !== 'agenda' || L.E.camadas.length || /input|select|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); mudarSemana(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); mudarSemana(1); }
  });

  function abrirEvento(id) {
    var a = L.D.agenda.find(function (x) { return x.id === id; });
    var c = a.clienteId && L.cli(a.clienteId), r = L.usuario(a.responsavelId);
    var msg = c ? 'Olá, ' + L.primeiroNome(c.nome) + '! Confirmando seu horário na ' + L.D.loja.nome + ': ' + Datas.porExtenso(a.dia) + ' às ' + a.inicio + ' (' + a.titulo.toLowerCase() + '). Até lá!' : '';
    var m = L.modal({ titulo: a.titulo,
      corpo: '<dl class="atributos"><dt>Quando</dt><dd>' + esc(Datas.porExtenso(a.dia)) + ', ' + a.inicio + '–' + a.fim + '</dd><dt>Tipo</dt><dd><span class="pilula" style="background:color-mix(in srgb,' + L.COR_AGENDA[a.tipo] + ' 16%,transparent)">' + TIPOS[a.tipo] + '</span></dd><dt>Cliente</dt><dd>' + esc(c ? c.nome : '—') + '</dd><dt>Responsável</dt><dd>' + esc(r ? r.nome + ' ' + r.sobrenome : '—') + '</dd></dl>',
      pe: (c ? '<button class="btn" data-abrir-ficha="' + c.id + '">' + ic('clientes') + 'Abrir ficha</button>' + L.linkWa(msg, 'Confirmar horário', '', c) : '') });
    m.addEventListener('click', function (e) { var b = e.target.closest('[data-abrir-ficha]'); if (b) { m.fechar(); L.abrirCliente(b.dataset.abrirFicha, { semRota: true }); } });
  }

  L.novoCompromisso = function (opcoes) {
    var clientes = L.D.clientes.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    var m = L.modal({ titulo: 'Novo compromisso',
      corpo: '<div class="grade-form">' +
        '<label class="campo"><span>Tipo</span><select class="entrada" id="nc-tipo">' + Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '">' + TIPOS[k] + '</option>'; }).join('') + '</select></label>' +
        '<label class="campo"><span>Cliente</span><select class="entrada" id="nc-cli"><option value="">Sem cliente</option>' + clientes.map(function (c) { return '<option value="' + c.id + '"' + (opcoes.clienteId === c.id ? ' selected' : '') + '>' + esc(c.nome) + '</option>'; }).join('') + '</select></label>' +
        '<label class="campo"><span>Dia</span><input class="entrada" type="date" id="nc-dia" value="' + Datas.somarDias(L.hoje, 1) + '"></label>' +
        '<label class="campo"><span>Início</span><input class="entrada" type="time" id="nc-hora" value="10:00" min="09:00" max="18:30" step="900"></label>' +
        '<label class="campo"><span>Duração</span><select class="entrada" id="nc-dur"><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">1 hora</option></select></label>' +
        '<label class="campo"><span>Título</span><input class="entrada" id="nc-titulo" placeholder="Ex.: Prova de alianças"></label></div><p id="nc-erro" role="alert" style="color:var(--rubi-texto)"></p>',
      pe: '<button class="btn ouro" id="nc-ok">' + ic('check') + 'Agendar</button>' });
    L.$('#nc-ok', m).addEventListener('click', function () {
      var dia = L.$('#nc-dia', m).value, hora = L.$('#nc-hora', m).value, dur = Number(L.$('#nc-dur', m).value), tipo = L.$('#nc-tipo', m).value;
      if (!dia || !hora) { L.$('#nc-erro', m).textContent = 'Informe dia e horário.'; Som.tocar('erro'); return; }
      var mi = minutos(hora) + dur, fim = String(Math.floor(mi / 60)).padStart(2, '0') + ':' + String(mi % 60).padStart(2, '0');
      var conflito = L.D.agenda.find(function (a) { return a.dia === dia && a.inicio < fim && hora < a.fim; });
      var novo = { id: 'a' + Date.now().toString(36), dia: dia, inicio: hora, fim: fim, tipo: tipo, titulo: L.$('#nc-titulo', m).value.trim() || TIPOS[tipo], clienteId: L.$('#nc-cli', m).value || null, responsavelId: L.E.usuario.id };
      L.D.agenda.push(novo); L.salvar(); m.fechar(); Som.tocar('sucesso');
      inicio = Datas.inicioDaSemana(dia); diaCelular = dia;
      L.toast('Agendado: ' + esc(novo.titulo) + ', ' + esc(Datas.porExtenso(dia)) + ' às ' + hora + '.' + (conflito ? ' Atenção: coincide com “' + esc(conflito.titulo) + '”.' : ''), { icone: conflito ? 'alerta' : 'check' });
      if (L.E.rota === 'agenda') L.atualizar(); else L.ir('agenda');
    });
  };
})(L);
