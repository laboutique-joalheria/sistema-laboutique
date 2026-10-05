# Regras do projeto

## Sites para clientes

Todo site que fizermos segue estas regras, desde o primeiro commit:

1. **Domínio próprio, sempre.** O site é publicado num domínio do cliente, de preferência um subdomínio (ex.: `sistema.dominiodaloja.com.br`). Nunca fica só no endereço `.github.io`. Motivo: todos os sites do GitHub Pages de uma mesma conta ou organização dividem essa origem, e um site conseguiria ler o que outro guarda no navegador (inclusive dados reais de clientes).
   - DNS: registro `CNAME` do subdomínio apontando para `<organização-do-cliente>.github.io` (ex.: `laboutique-joalheria.github.io`).
   - GitHub: **Settings → Pages → Custom domain** com o subdomínio e **Enforce HTTPS** marcado.
   - Verificar o domínio na conta (**Settings → Pages → Add a domain**) para ninguém sequestrar o subdomínio.
   - Se o cliente ainda não tem domínio, registrar um (registro.br para `.com.br`) antes de entregar.
2. **Organização própria por cliente** no GitHub (gratuita, criada na nossa conta; ex.: `laboutique-joalheria`), com um **repositório limpo** só com o site. Nada de dados reais, nem no histórico. A organização isola o cliente dos nossos outros sites e pode ser entregue a ele depois, convidando-o como dono.
3. **Publicação pelo GitHub Actions** (`.github/workflows/pages.yml`): roda os testes e só então publica, e só os arquivos do site.
4. **Documentos internos** (análises de concorrentes, números e relatórios do cliente) ficam em repositório privado.
5. **LGPD:** relatórios e planilhas reais do cliente nunca entram em git. O `.gitignore` bloqueia `*.pdf`. Antes de publicar, fazer uma varredura cruzando os arquivos com os dados reais (nomes completos e pedaços de nomes, telefones, CPFs e endereços).
6. `.claude/settings.json` de cada repositório traz a permissão `Bash(git push:*)`.
