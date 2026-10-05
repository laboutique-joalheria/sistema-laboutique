'use strict';
/* Importação do G-Ótica no Chromium (Playwright), com PDFs SINTÉTICOS gerados na hora
   (tests/fixtures/g-otica.js): nenhum dado real de cliente entra no repositório.
   Rodar na pasta do site, com ele servido localmente (python3 -m http.server 8765):
     node tests/importacao.e2e.js
   Para conferir também com os relatórios reais da loja (ficam fora do repositório):
     LAPIDAR_PDF_CLIENTES=/caminho/clientes.pdf LAPIDAR_PDF_PRODUTOS=/caminho/produtos.pdf node tests/importacao.e2e.js
   Com LAPIDAR_CAPTURAS=/pasta, salva capturas de tela ali. */
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const os = require('os');
const path = require('path');
const F = require('./fixtures/g-otica.js');

const URL = process.env.LAPIDAR_URL || 'http://localhost:8765/';
const CAPTURAS = process.env.LAPIDAR_CAPTURAS || '';
const falhas = [];
const checar = (ok, msg) => { if (!ok) falhas.push(msg); console.log((ok ? 'ok   ' : 'FALHA') + ' ' + msg); };
const esperar = (p, ms = 350) => p.waitForTimeout(ms);
const rolagemLateral = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const capturar = (p, nome) => CAPTURAS ? p.screenshot({ path: path.join(CAPTURAS, nome + '.png'), fullPage: false }) : null;

async function abrir(browser, opcoes) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' }, opcoes));
  const page = await ctx.newPage();
  page.erros = [];
  page.on('pageerror', e => page.erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) page.erros.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('lapidar.tour', '1'); });
  await page.reload();
  await page.click('[data-entrar="u1"]'); await esperar(page, 900);
  return page;
}

/* Abre a importação, manda os PDFs e espera os dois cartões ficarem prontos. */
async function importarArquivos(p, arquivos, limite) {
  await p.setInputFiles('#imp-arquivo', arquivos);
  await p.waitForFunction(() => document.querySelectorAll('.imp-cartao.ok, .imp-cartao.alerta, .imp-cartao.erro').length >= 2, null, { timeout: limite || 30000 });
  await esperar(p, 400);
}

(async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'lapidar-e2e-'));
  const pdfClientes = path.join(pasta, 'cadastro-clientes-sintetico.pdf');
  const pdfProdutos = path.join(pasta, 'posicao-estoque-sintetico.pdf');
  fs.writeFileSync(pdfClientes, F.pdfDe(F.relatorioClientes()));
  fs.writeFileSync(pdfProdutos, F.pdfDe(F.relatorioProdutos()));
  const browser = await chromium.launch();

  /* 1. Proprietário traz os dois relatórios sintéticos */
  let p = await abrir(browser);
  checar(await p.$('.faixa-dados') !== null, 'Hoje avisa que são exemplos e convida a importar');
  checar(await p.evaluate(() => L.wa('oi', L.cli('c03')).startsWith('https://wa.me/?')), 'cliente de exemplo: WhatsApp sem número');
  await p.keyboard.press('F2'); await esperar(p);
  await p.evaluate(() => L.abrirImportacao()); await esperar(p, 300);
  checar(await p.$('.folha.importar') === null, 'com venda aberta, a importação espera (não troca a base por baixo)');
  await p.click('#folha-fechar'); await esperar(p, 400);
  await p.click('.faixa-dados [data-importar-dados]'); await esperar(p, 600);
  checar(await p.$('.folha.importar') !== null, 'importação abre');
  await importarArquivos(p, [pdfClientes, pdfProdutos]);
  checar(await p.$$eval('.imp-cartao.ok', l => l.length) === 2, 'os dois PDFs lidos e reconhecidos');
  const previa = await p.textContent('#imp-etapa');
  checar(previa.includes('5 de 5 lidos'), 'clientes conferem com o total impresso');
  checar(previa.includes('Todos os totais conferem'), 'produtos conferem com todos os totais impressos');
  checar(previa.includes('Campos grudados no PDF'), 'nome e endereço grudados pelo pdf.js foram separados');
  checar(previa.includes('***.982.247-**'), 'CPF aparece mascarado na prévia');
  checar(await rolagemLateral(p) <= 0, 'prévia sem rolagem lateral (1440 px)');
  await p.click('details.problema summary'); await esperar(p, 200);
  checar(await p.$('details.problema[open] li') !== null, 'problema abre e mostra exemplos');
  await capturar(p, 'importar-previa');

  await p.click('[data-importar]'); await esperar(p, 400);
  await p.click('.modal [data-sim]'); await esperar(p, 900);
  checar((await p.textContent('.sucesso h3')).includes('5 clientes e 6 produtos'), 'importação concluída com as contagens certas');
  await capturar(p, 'importar-feito');
  await p.click('[data-ver="clientes"]'); await esperar(p, 800);
  checar(await p.$$eval('#lista-clientes .lista-linha', l => l.length) === 5, 'clientes importados na lista');
  checar(await p.$('[data-filtro="revisar"]') !== null, 'filtro Revisar aparece');
  await p.fill('#busca-clientes', 'andreia'); await esperar(p);
  await p.click('#lista-clientes .lista-linha'); await esperar(p, 600);
  await p.click('[data-aba-ficha="dados"]'); await esperar(p);
  const fichaAndreia = await p.textContent('#ficha-conteudo');
  checar(fichaAndreia.includes('Rua das Acacias'), 'endereço separado do nome vai para a ficha');
  checar(fichaAndreia.includes('separados'), 'ficha lembra de conferir os campos separados');
  checar(await p.$eval('.gaveta a[data-wa]', a => a.href.includes('wa.me/5555991234567')), 'cliente importado: WhatsApp abre a conversa dele');
  await p.keyboard.press('Escape'); await esperar(p);

  await p.click('#nav [data-ir="produtos"]'); await esperar(p, 800);
  checar(await p.$$eval('.grade-produtos .produto', l => l.length) === 6, 'produtos importados na grade');
  checar(await p.$('[data-filtro-prod="indice"]') !== null, 'filtro Preço por índice aparece');
  checar((await p.textContent('#produtos-conteudo')).includes('Índice 1,098'), 'peça sem preço mostra o índice no lugar do preço');

  /* 2. Venda de peça sem preço pede o valor e guarda no cadastro */
  await p.keyboard.press('F2'); await esperar(p);
  await p.click('[data-escolher-cliente]'); await esperar(p, 500);
  await p.click('[data-add-produto="gp61"]'); await esperar(p, 400);
  checar(await p.$('#pp-valor') !== null, 'peça sem preço pergunta o valor');
  await p.fill('#pp-valor', '150,00'); await p.click('.modal [data-sim]'); await esperar(p, 400);
  checar((await p.textContent('#resumo')).includes('150,00'), 'item entra com o preço informado');
  await p.click('#folha-fechar'); await esperar(p, 300);
  await p.click('.modal [data-sim]'); await esperar(p, 400);
  checar(await p.evaluate(() => L.prod('gp61').precoCentavos) === 15000, 'preço guardado no cadastro da peça');

  /* 3. Valor do índice em Ajustes calcula o preço das demais */
  await p.click('#nav [data-ir="ajustes"]'); await esperar(p, 700);
  await p.fill('#valor-indice', '100,00'); await p.click('#form-indice [type="submit"]'); await esperar(p, 500);
  checar(await p.evaluate(() => L.precoDe(L.prod('gp66'))) === 32580, 'preço = índice × valor do índice');
  checar(await p.evaluate(() => L.precoDe(L.prod('gp61'))) === 15000, 'quem tem preço próprio não muda');

  /* 4. Dado importado não some no dia seguinte nem ao recarregar */
  await p.reload(); await esperar(p, 900);
  checar(await p.evaluate(() => L.D.origem === 'importado' && L.D.clientes.length === 5), 'dados importados continuam depois de recarregar');
  await p.click('#nav [data-ir="hoje"]'); await esperar(p, 700);
  checar(await p.$('.faixa-dados') === null, 'aviso de exemplos some depois de importar');
  checar(await p.$('[data-filtrar-produtos="sem-preco"]') !== null, 'Hoje mostra os acertos da migração');
  await p.click('[data-filtrar-produtos="sem-preco"]'); await esperar(p, 700);
  checar((await p.textContent('#produtos-conteudo')).includes('Compras'), 'atalho leva às peças sem preço');
  await p.click('#nav [data-ir="clientes"]'); await esperar(p, 600);
  for (const tela of ['vendas', 'pedidos', 'financeiro', 'agenda', 'relatorios']) {
    await p.click('#nav [data-ir="' + tela + '"]'); await esperar(p, 500);
  }
  checar(p.erros.length === 0, 'telas vazias depois da importação sem erro: ' + p.erros.join(' | '));

  /* 4b. Caixa de ontem fechado: no dia seguinte abre de novo, com o mesmo fundo */
  await p.evaluate(() => { L.D.caixa.fechado = { contado: 1000, esperado: 1000, hora: '18:00' }; L.D.caixa.dia = '2000-01-01'; L.salvar(); });
  await p.reload(); await esperar(p, 900);
  checar(await p.evaluate(() => !L.D.caixa.fechado && L.D.caixa.dia === L.hoje && L.D.caixasAnteriores.length === 1), 'caixa de ontem vai para o histórico e o de hoje abre');

  /* 4c. Outra aba aberta antes não apaga a importação ao salvar */
  const aba2 = await p.context().newPage();
  await aba2.goto(URL); await esperar(aba2, 900);
  await p.evaluate(() => { L.D.config.marcaAba = 'a1'; L.salvar(); });
  await esperar(aba2, 500);
  checar(await aba2.evaluate(() => L.D.config.marcaAba === 'a1'), 'a outra aba recarrega quando esta grava');
  await aba2.evaluate(() => { L._versao = 'velha'; L.D.clientes = []; return L.salvar(); });
  checar(await p.evaluate(() => JSON.parse(localStorage.getItem('lapidar.dados.v1')).clientes.length === 5), 'aba com dados velhos não grava por cima');
  await aba2.close();

  /* 5. Voltar aos exemplos */
  await p.click('#nav [data-ir="ajustes"]'); await esperar(p, 600);
  await p.click('[data-restaurar]'); await esperar(p, 300);
  await p.click('.modal [data-sim]'); await esperar(p, 700);
  checar(await p.evaluate(() => !L.D.origem && L.D.clientes.some(c => /Fernanda/.test(c.nome))), 'voltar aos exemplos apaga os importados');
  checar(p.erros.length === 0, 'importação sem erro de console: ' + p.erros.join(' | '));
  await p.context().close();

  /* 6. Celular: importar pelo menu Mais → Ajustes, sem rolagem lateral */
  p = await abrir(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await p.evaluate(() => L.abrirImportacao()); await esperar(p, 600);
  await importarArquivos(p, [pdfClientes, pdfProdutos]);
  checar(await rolagemLateral(p) <= 0, 'prévia sem rolagem lateral (390 px)');
  await capturar(p, 'importar-celular');
  checar(p.erros.length === 0, 'celular sem erro de console: ' + p.erros.join(' | '));
  await p.context().close();

  /* 7. Opcional: relatórios reais da loja (fora do repositório) */
  const realC = process.env.LAPIDAR_PDF_CLIENTES, realP = process.env.LAPIDAR_PDF_PRODUTOS;
  if (realC && realP && fs.existsSync(realC) && fs.existsSync(realP)) {
    p = await abrir(browser);
    await p.evaluate(() => L.abrirImportacao()); await esperar(p, 600);
    const t0 = Date.now();
    await importarArquivos(p, [realC, realP], 180000);
    console.log('      leitura dos PDFs reais: ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
    checar(await p.$$eval('.imp-cartao.ok', l => l.length) === 2, 'reais: os dois relatórios conferem com os totais impressos');
    await capturar(p, 'real-previa');
    await p.click('[data-importar]'); await esperar(p, 400);
    await p.click('.modal [data-sim]'); await esperar(p, 1200);
    const n = await p.evaluate(() => [L.D.clientes.length, L.D.produtos.length, L.salvar()]);
    console.log('      importados: ' + n[0] + ' clientes, ' + n[1] + ' produtos; gravou: ' + n[2]);
    checar(n[2] === true, 'reais: cabem no armazenamento do navegador');
    await p.click('[data-ver="produtos"]'); await esperar(p, 1200);
    checar(await p.$$eval('.grade-produtos .produto', l => l.length) === 60, 'reais: produtos desenhados aos poucos (60 por vez)');
    await capturar(p, 'real-produtos');
    await p.click('#nav [data-ir="hoje"]'); await esperar(p, 900);
    await capturar(p, 'real-hoje');
    checar(p.erros.length === 0, 'reais: sem erro de console: ' + p.erros.join(' | '));
    await p.context().close();
  } else console.log('-     relatórios reais não informados (LAPIDAR_PDF_CLIENTES / LAPIDAR_PDF_PRODUTOS): etapa pulada');

  await browser.close();
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log(falhas.length ? '\n' + falhas.length + ' falha(s).' : '\nTudo certo.');
  process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
