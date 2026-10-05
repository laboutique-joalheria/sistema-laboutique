'use strict';
/* Jornadas no Chromium (Playwright). Rodar com o site servido localmente:
     python3 -m http.server 8765   (em outro terminal)
     node tests/navegador.e2e.js
   Falha (código 1) se houver erro de console, rolagem lateral ou jornada quebrada. */
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const URL = process.env.LAPIDAR_URL || 'http://localhost:8765/';
const falhas = [];
const checar = (ok, msg) => { if (!ok) falhas.push(msg); console.log((ok ? 'ok   ' : 'FALHA') + ' ' + msg); };

async function abrir(browser, opcoes) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' }, opcoes));
  const page = await ctx.newPage();
  page.erros = [];
  page.on('pageerror', e => page.erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) page.erros.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); // fonte externa não é assunto deste teste
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('lapidar.tour', '1'); });
  await page.reload();
  return page;
}
const esperar = (p, ms = 350) => p.waitForTimeout(ms);
const rolagemLateral = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

(async () => {
  const browser = await chromium.launch();

  /* 1. Proprietário: venda dividida, orçamento convertido, financeiro e caixa */
  let p = await abrir(browser);
  await p.click('[data-entrar="u1"]'); await esperar(p, 900);
  checar(await p.$$eval('#nav [data-ir]', l => l.length) === 9, 'proprietário vê as 9 telas');

  await p.keyboard.press('F2'); await esperar(p);
  await p.fill('#v-busca-cli', '99000-0103'); await esperar(p);
  checar((await p.textContent('#v-res-cli')).includes('Fernanda'), 'busca cliente por trecho do telefone');
  await p.click('[data-escolher-cliente]'); await esperar(p, 500);
  await p.fill('#v-busca-prod', 'aliansa 18k'); await esperar(p);
  checar(await p.$('[data-add-produto="j02"]') !== null, 'busca de produto tolera erro de digitação');
  await p.click('[data-add-produto="j02"]'); await esperar(p);
  checar(await p.inputValue('[data-aro="0"]') === '14', 'aro vem da ficha da cliente');
  await p.click('[data-ir-passo="3"]'); await esperar(p, 500);
  await p.click('[data-forma="dinheiro"]'); await esperar(p);
  await p.fill('[data-valor-pag="0"]', '4.000,00'); await esperar(p);
  checar((await p.textContent('#v-status')).includes('troco'), 'dinheiro acima do total mostra troco');
  await p.click('.folha-acoes [data-concluir]'); await esperar(p, 900);
  checar(await p.$('.sucesso') !== null, 'venda concluída');
  await p.click('[data-pos="fechar"]'); await esperar(p, 500);

  await p.click('[data-acao="orcamento"]'); await esperar(p);
  await p.click('[data-escolher-cliente]'); await esperar(p, 500);
  await p.click('[data-add-produto="j06"]'); await esperar(p);
  await p.click('[data-ir-passo="3"]'); await esperar(p, 500);
  await p.click('.folha-acoes [data-salvar-orcamento]'); await esperar(p, 600);
  await p.click('#nav [data-ir="vendas"]'); await esperar(p, 700);
  await p.click('[data-aba-vendas="orcamentos"]'); await esperar(p, 600);
  const conv = await p.$$('[data-converter]');
  checar(conv.length >= 3, 'orçamento novo aparece na lista');
  await conv[conv.length - 1].click(); await esperar(p, 600);
  checar(await p.$('[aria-current="step"][data-passo="3"]') !== null, 'conversão abre direto no pagamento, sem redigitar');
  await p.click('[data-forma="pix"]'); await esperar(p);
  await p.click('.folha-acoes [data-concluir]'); await esperar(p, 900);
  checar((await p.textContent('.efeitos')).includes('convertido'), 'orçamento marcado como convertido');
  await p.click('[data-pos="fechar"]'); await esperar(p, 500);

  await p.click('#nav [data-ir="financeiro"]'); await esperar(p, 700);
  await p.click('[data-baixar]'); await esperar(p);
  await p.click('[data-confirmar-baixa]'); await esperar(p, 600);
  checar((await p.textContent('#toasts')).includes('Recebido'), 'baixa de parcela');
  await p.click('#toasts button'); await esperar(p, 500);
  checar((await p.textContent('#toasts')).includes('desfeita'), 'desfazer baixa (estorno explícito)');
  await p.click('[data-aba-fin="caixa"]'); await esperar(p, 600);
  await p.click('[data-fechar-caixa]'); await esperar(p);
  const esperado = await p.textContent('#cx-dif strong');
  await p.fill('#cx-contado', esperado.replace('R$', '').trim()); await esperar(p);
  checar((await p.textContent('#cx-dif')).includes('Confere'), 'fechamento de caixa confere');
  await p.click('#cx-ok'); await esperar(p, 500);

  await p.click('#nav [data-ir="clientes"]'); await esperar(p, 600);
  await p.fill('#busca-clientes', 'Joana Prado'); await esperar(p);
  await p.click('[data-novo-cliente="Joana Prado"]'); await esperar(p, 500);
  await p.fill('#nc-tel', '93 98888 7777'); await p.click('button[form="form-cliente"]'); await esperar(p, 700);
  checar(await p.$('.gaveta h2') !== null && (await p.textContent('.gaveta h2')) === 'Joana Prado', 'cadastro rápido abre a ficha nova');
  await p.keyboard.press('Escape'); await esperar(p);

  await p.click('#nav [data-ir="produtos"]'); await esperar(p, 600);
  await p.click('[data-novo-produto]'); await esperar(p, 500);
  await p.click('[data-seg-novo="otica"]'); await esperar(p);
  checar(await p.$('#np-ponte') !== null, 'cadastro de armação pede medidas aro/ponte/haste');
  await p.fill('#np-nome', 'Armação titânio leve'); await p.fill('#np-preco', '650'); await p.click('button[form="form-produto"]'); await esperar(p, 600);
  checar((await p.textContent('#vista')).includes('Armação titânio leve'), 'produto novo no catálogo');

  await p.click('#nav [data-ir="agenda"]'); await esperar(p, 600);
  const semana1 = await p.textContent('.agenda-barra h2');
  await p.keyboard.press('ArrowRight'); await esperar(p, 400);
  checar(semana1 !== await p.textContent('.agenda-barra h2'), 'seta do teclado troca a semana');
  await p.click('[data-novo-compromisso]'); await esperar(p);
  await p.click('#nc-ok'); await esperar(p, 600);
  checar((await p.textContent('#toasts')).includes('Agendado'), 'novo compromisso');

  await p.keyboard.press('Control+k'); await esperar(p);
  await p.keyboard.type('pedido 1042'); await esperar(p);
  await p.keyboard.press('Enter'); await esperar(p, 900);
  checar(await p.evaluate(() => L.E.rota) === 'pedidos', 'Ctrl+K + Enter abre o pedido');
  await p.click('#abrir-sino'); await esperar(p);
  checar(await p.$('.popover .atencao-item') !== null, 'sino lista pendências');
  await p.keyboard.press('Escape');
  checar(p.erros.length === 0, 'proprietário sem erro de console: ' + p.erros.join(' | '));
  await p.context().close();

  /* 2. Vendas: menos telas e limite de desconto */
  p = await abrir(browser);
  await p.click('[data-entrar="u2"]'); await esperar(p, 900);
  const telas = await p.$$eval('#nav [data-ir]', l => l.map(a => a.dataset.ir));
  checar(!telas.includes('financeiro') && !telas.includes('relatorios'), 'Vendas não vê Financeiro nem Relatórios');
  await p.goto(URL + '#financeiro'); await esperar(p, 900);
  checar(await p.evaluate(() => L.E.rota) === 'hoje', 'link direto para tela sem permissão volta ao Hoje');
  await p.keyboard.press('F2'); await esperar(p);
  await p.click('[data-consumidor-final]'); await esperar(p, 500);
  await p.click('[data-add-produto="j01"]'); await esperar(p);
  await p.click('[data-ir-passo="3"]'); await esperar(p, 500);
  await p.click('[data-tipo-desc="pct"]'); await esperar(p);
  await p.fill('#v-desconto', '15'); await esperar(p);
  await p.click('[data-forma="pix"]'); await esperar(p);
  checar((await p.textContent('#v-status')).includes('aprovação do proprietário'), 'desconto acima de 10% bloqueado para Vendas');
  checar(p.erros.length === 0, 'vendas sem erro de console: ' + p.erros.join(' | '));
  await p.context().close();

  /* 3. Laboratório: celular, tour e esteira */
  p = await abrir(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await p.evaluate(() => localStorage.removeItem('lapidar.tour'));
  await p.click('[data-entrar="u3"]'); await esperar(p, 1400);
  checar(await p.$('.tour-balao') !== null, 'tour aparece no primeiro acesso');
  for (let i = 0; i < 3 && await p.$('[data-tour="proximo"]'); i++) { await p.click('[data-tour="proximo"]'); await esperar(p, 400); }
  checar(await p.$('.tour-balao') === null, 'tour termina');
  checar(await p.$('#nav-inferior .vender') === null, 'laboratório não tem botão Vender');
  for (const t of ['hoje', 'pedidos', 'agenda', 'clientes', 'ajustes']) {
    await p.evaluate(t => L.ir(t), t); await esperar(p, 250);
    checar(await rolagemLateral(p) <= 0, 'sem rolagem lateral em ' + t + ' (390 px)');
  }
  checar(p.erros.length === 0, 'laboratório sem erro de console: ' + p.erros.join(' | '));
  await browser.close();

  console.log(falhas.length ? '\n' + falhas.length + ' falha(s).' : '\nTudo certo.');
  process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
