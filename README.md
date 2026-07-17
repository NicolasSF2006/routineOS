# RoutineOS

Aplicação web responsiva para criar rotinas de estudo, acompanhar sessões e calendário, gerar trilhas e conversar com um Mentor IA. Os dados do usuário permanecem no navegador e podem ser exportados em backup.

## Funcionalidades

- rotina semanal/mensal vazia no primeiro acesso;
- construtor com blocos, recorrência, conflitos, drag-and-drop, swipe e desfazer/refazer;
- sessões, presença, pausas, conclusão e calendário;
- trilhas por tema com recursos, cursos, favoritos e progresso local;
- Mentor IA com Gemini, Groq, OpenRouter e OpenAI, modos manual/automático e fallback;
- configurações, temas, sons e backup/restauração.

## Stack e requisitos

Next.js 16, React 19, TypeScript estrito, Tailwind CSS 4, Base UI/shadcn, Vitest, Testing Library e Playwright. Use Node.js 22 e npm compatível com o lockfile.

## Instalação

```bash
npm ci
cp .env.example .env.local
npm run dev
```

A aplicação abre em `http://localhost:3000`. Nenhuma chave é obrigatória: sem provedores configurados, o Mentor usa o modo local.

## Variáveis de ambiente

Todas são exclusivas do servidor. Nunca use `NEXT_PUBLIC_` para chaves.

| Variável                                  | Valores/uso                                         |
| ----------------------------------------- | --------------------------------------------------- |
| `MENTOR_AI_PROVIDER`                      | `auto`, `gemini`, `groq`, `openrouter` ou `openai`  |
| `GEMINI_API_KEY` / `GEMINI_MODEL`         | credencial e modelo Gemini                          |
| `GROQ_API_KEY` / `GROQ_MODEL`             | credencial e modelo Groq                            |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | credencial e modelo OpenRouter                      |
| `OPENAI_API_KEY` / `OPENAI_MODEL`         | credencial e modelo OpenAI                          |
| `RATE_LIMIT_TRUST_PROXY_HOPS`             | quantidade exata de proxies controlados; padrão `0` |

No modo `auto`, a ordem preservada é Gemini → Groq → OpenRouter → OpenAI. O comando `/provedores` envia uma solicitação curta a cada provedor configurado.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run test:coverage
npm run test:e2e
npm run test:e2e:ui
npm run test:a11y
npm run test:visual
npm run test:visual:update  # atualização explícita
npm run build
npm run check
```

`check` executa formatação, lint, tipos, testes unitários e build. E2E, axe e regressão visual ficam separados por custo.

## Estrutura

```text
src/
  app/                    páginas, limites de erro e APIs
  components/             UI, layout e componentes compartilhados
  features/               rotina, Mentor, trilhas, calendário, sessão e configurações
    routine/domain/       regras puras de horários e conflitos
    mentor/server/        roteamento, provedores, transporte e observabilidade
  server/                 utilitários HTTP e proteções de rota
  lib/storage.ts          fachada compatível de persistência e migração
tests/
  unit/ integration/      Vitest e fixtures determinísticas
  e2e/ visual/ a11y/      Playwright, snapshots e axe
docs/                     arquitetura e operação
```

Detalhes: [arquitetura](docs/ARCHITECTURE.md), [domínio](docs/DOMAIN.md), [Mentor](docs/MENTOR_AI.md), [armazenamento](docs/STORAGE.md) e [testes](docs/TESTING.md).

## Deploy e segurança

O build é autocontido e não exige plataforma específica. Configure variáveis somente no servidor, execute `npm ci && npm run check` e siga [DEPLOYMENT.md](docs/DEPLOYMENT.md). As rotas limitam payload, taxa e tempo; Markdown não aceita HTML bruto; logs não contêm prompts ou chaves. Consulte [SECURITY.md](docs/SECURITY.md) e [PRIVACY-NOTES.md](docs/PRIVACY-NOTES.md).

## Troubleshooting

- Mentor em modo local: confira a chave do provedor e `MENTOR_AI_PROVIDER`.
- Playwright sem navegador: `npx playwright install chromium`; em ambiente com Chromium do sistema, defina `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
- Snapshot diferente: revise a imagem; só então rode `npm run test:visual:update`.
- Dados antigos: exporte backup antes de atualizar e veja a estratégia de migração em [STORAGE.md](docs/STORAGE.md).

## Contribuição

Leia [CONTRIBUTING.md](CONTRIBUTING.md). Não altere contratos persistidos, fallback, classes visuais ou textos sem uma decisão explícita e testes de compatibilidade.

O runtime suportado é Node 22 (`>=22 <23`). `npm run check` executa formatação, lint, tipos, unitários e build; antes de merge, execute também cobertura, E2E, acessibilidade e regressão visual conforme [docs/TESTING.md](docs/TESTING.md).
