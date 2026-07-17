# Deploy e rollback

## Publicação

1. use Node 22;
2. configure variáveis do `.env.example` no ambiente do servidor;
3. execute `npm ci`, `npm run check`, `npm run test:e2e` e `npm run test:a11y`;
4. gere `npm run build` e publique o artefato Next.js;
5. faça smoke test de rotina vazia, backup, Mentor local e um provedor configurado.

O deploy não depende obrigatoriamente de Vercel. As APIs exigem runtime Node por DNS seguro e integrações HTTP.

## Rollback

Mantenha o artefato anterior e o commit correspondente. Antes de mudança persistida, exporte backup de teste no schema anterior. Em incidente, reverta o artefato, não o localStorage; restaure backup somente com consentimento do usuário. Verifique compatibilidade do schema em `docs/STORAGE.md`.

Atualize dependências em lote pequeno, leia changelogs, rode `npm audit`, regenere lockfile somente pelo registry público e execute toda a matriz.

O contrato é Node `>=22 <23` em `package.json`, `.nvmrc` e CI; `@types/node` também usa a linha 22. Em proxy controlado, configure `RATE_LIMIT_TRUST_PROXY_HOPS` com o número exato de saltos; mantenha `0` quando os headers encaminhados não forem confiáveis. Em múltiplas réplicas, o limite em memória é apenas por instância.
