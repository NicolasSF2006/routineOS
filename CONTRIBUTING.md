# Contribuindo

Use Node 22, `npm ci` e uma branch pequena. Antes de abrir PR, rode `npm run check`; para mudanças de interface rode E2E, axe e visual.

Regras essenciais:

- preserve comportamento, textos, classes responsivas e `wrap-break-word` sem decisão aprovada;
- não mude chaves/formatos persistidos sem migração e fixture antiga;
- não mude contratos de API nem ordem de fallback sem compatibilidade;
- nunca use provedores reais em testes;
- escreva comentários, documentação e mensagens de teste em português do Brasil;
- adicione regra de negócio como função pura antes de acoplá-la ao JSX;
- não versione `.env.local`, relatórios, traces, vídeos, backups ou patches.

Descreva no PR riscos, migração, testes executados e snapshots revisados.

Use Node 22 e não atualize snapshots implicitamente. O baseline visual oficial é gerado em Linux pela CI; revise as diferenças nesse ambiente antes de atualizar snapshots. Não descreva a auditoria axe como WCAG AA completa enquanto contraste estiver fora do gate.
