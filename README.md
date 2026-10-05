# Lapidar · La Boutique Joalheria e Óptica

Sistema de gestão para **joalheria e ótica**, feito para a La Boutique (Ijuí, RS). "Lapidar" vale para os dois lados da loja: lapida-se a pedra e lapida-se a lente.

> **Demonstração.** O site publicado só traz exemplos **fictícios**. Os clientes e produtos reais entram pela importação dos relatórios do G-Ótica, que acontece **no navegador da loja**: o PDF não sai do computador e nada vai para servidor.

## Publicar

O site é estático (HTML, CSS e JS puros, sem build). Ele é publicado pelo GitHub Actions e sempre em **domínio próprio**.

1. **GitHub Pages:** em **Settings → Pages → Source**, escolha **GitHub Actions**. O fluxo `.github/workflows/pages.yml` roda a cada push na `main`: primeiro os testes de regra, depois publica só o site (`index.html`, `css/`, `js/`). Se um teste falhar, nada é publicado.
2. **Domínio próprio** (ex.: `sistema.dominiodaloja.com.br`):
   - no DNS do domínio, crie um registro `CNAME` de `sistema` apontando para `laboutique-joalheria.github.io`;
   - em **Settings → Pages → Custom domain**, informe o subdomínio e marque **Enforce HTTPS** quando liberar;
   - na conta do GitHub, em **Settings → Pages → Add a domain**, verifique o domínio para ninguém sequestrar o subdomínio.

O domínio próprio não é só estética. Os sites de uma mesma conta ou organização no `github.io` dividem a mesma origem e enxergariam os dados que a loja guarda no navegador. Por isso o sistema mora na organização da loja (`laboutique-joalheria`) e vai para domínio próprio.

Até o domínio ficar pronto, o endereço provisório é `https://laboutique-joalheria.github.io/sistema-laboutique/`. Use-o só para demonstração, nunca com dados reais.

## Abrir no computador

```bash
python3 -m http.server 8765
# abra http://localhost:8765
```

Escolha um perfil na entrada. Cada perfil vê telas diferentes:

| Perfil | Vê |
|---|---|
| Proprietário | Tudo, inclusive financeiro, relatórios, custo dos produtos e a importação |
| Vendas | Atendimento, venda, orçamento, pedidos e agenda. Desconto acima de 10% pede o proprietário |
| Laboratório e bancada | Pedidos, agenda e clientes. Não vende |

## O que tem

- **Hoje:** pendências em ordem de urgência, cada uma com o próximo passo (inclusive mensagem de WhatsApp pronta).
- **Venda guiada:** cliente → itens → pagamento, com total sempre à vista, pagamento dividido, troco, crédito parcelado e crediário. Ao concluir, baixa o estoque, abre o pedido de óculos ou o serviço de joia e lança as parcelas.
- **Orçamento** que vira venda sem redigitar; **pedidos** com esteira própria para óculos (laboratório) e joias (bancada).
- **Clientes** com ficha única (compras, pedidos, receita OD/OE, aro) e **produtos** com atributos por segmento (metal e teor, medidas da armação, índice da lente).
- **Financeiro**, **agenda** e **relatórios** em forma de pergunta.
- **Trazer dados do G-Ótica** (Ajustes, ou `Ctrl K`): solte os PDFs de *Cadastro de Clientes* e *Posição do Estoque*.
  - O Lapidar lê no navegador e confere com os totais impressos no relatório.
  - Mostra os problemas, como telefone antigo, CPF inválido ou possível duplicado, e só então grava.
  - "Importar de novo" atualiza pelo código e mantém o que a loja já fez no sistema.
- **Busca universal** (`Ctrl K`), **F2** para vender, tema claro e escuro, sons sintetizados e efeitos 3D com opção de pausar.

## Dados e LGPD

- Nenhum dado real de cliente fica neste repositório. O `.gitignore` bloqueia arquivos PDF para que um relatório real nunca seja enviado por engano.
- Os testes usam relatórios **sintéticos** no formato do G-Ótica (`tests/fixtures/g-otica.js`), que geram até PDF de verdade para o teste no navegador.
- Dados importados ficam no armazenamento do navegador onde foram importados. Outro computador precisa importar de novo, até existir servidor.

## Estrutura

| Caminho | Função |
|---|---|
| `index.html` | Página única, ícones e desenhos técnicos em sprite SVG |
| `css/styles.css`, `css/motion.css` | Design system (paleta de gemas, contraste AA) e movimento |
| `js/regras/*.js` | Regras puras e testadas: dinheiro, datas, busca, venda, pedidos, pendências, CSV, importação do G-Ótica |
| `js/telas/*.js` | Uma tela por arquivo; `importar.js` é a importação |
| `js/nucleo.js`, `js/iniciar.js`, `js/venda.js` | Estado e rotas, entrada e atalhos, venda guiada |
| `js/vendor/pdfjs/` | pdf.js 3.11.174 (Apache 2.0), carregado só quando alguém importa |
| `tests/` | Regras, importação, contraste AA e jornadas no navegador |

## Testes

```bash
npm test                                   # regras, importação e contraste AA
python3 -m http.server 8765 & npm run e2e  # jornadas e importação no Chromium (Playwright)
```

Para conferir com os relatórios reais, na máquina de quem os tem (nunca versionar):

```bash
LAPIDAR_PDF_CLIENTES=/caminho/clientes.pdf LAPIDAR_PDF_PRODUTOS=/caminho/produtos.pdf node tests/importacao.e2e.js
```

## Próximos passos

- Confirmar com a loja como o preço das joias sai do índice e de onde vem o custo.
- Servidor, banco e login de verdade, para os dados valerem em qualquer computador.
- Nota fiscal, maquininha e conciliação, se a loja precisar.
