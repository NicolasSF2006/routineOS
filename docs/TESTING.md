# Testes

Vitest cobre domínio, parser, proposta Pomodoro, trilhas, armazenamento, backup, ambiente, erros HTTP, fallback, cooldown/rate limit e SSRF. Fixtures ficam em `tests/fixtures`; nenhuma suite usa APIs reais.

Playwright limpa localStorage em cada teste e fixa data/hora sem congelar timers. Os projetos são 1440×900, 1024×768 e 390×844. E2E, axe e visual têm scripts separados. Falhas guardam trace, vídeo e screenshot; sucessos não.

Snapshots ficam versionados. Para revisar uma mudança:

```bash
npm run test:visual
# inspecione as diferenças
npm run test:visual:update
```

Nunca atualize snapshots automaticamente em CI. O servidor do Playwright usa uma data fixa também durante o SSR, mantendo a primeira renderização alinhada ao relógio congelado do navegador e evitando avisos de hidratação causados apenas pela diferença entre os relógios do servidor e do teste.

## Estado da matriz em julho de 2026

O piso global do Vitest é 40% de statements, 30% de branches, 40% de functions e 40% de lines; módulos críticos possuem pisos maiores em `vitest.config.ts`. A validação atual possui 140 testes unitários/de integração e 56 cenários E2E, sem contar projetos ou viewports. Swipe, drag mobile, fechamento do bottom sheet por arrasto e bloqueio de scroll disparam eventos reais.

A estratégia visual oficial é **A, baseline Linux na CI**. A matriz contém 51 cenários e 51 snapshots `-linux.png` versionados, sem duplicar estados exclusivos de desktop ou mobile nos demais projetos. O job manual usa Ubuntu com o Chromium instalado pelo Playwright. Em macOS ou Windows, diferenças de rasterização devem ser revisadas pela CI Linux; baselines adicionais por plataforma só devem ser versionados quando houver uma decisão explícita. Em ambientes sem o navegador gerenciado, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` pode apontar para um Chromium local.

A auditoria automatizada contém 43 verificações em desktop, tablet e mobile. O cenário de bottom sheet é executado exclusivamente no projeto mobile, sem duplicação artificial em tablet ou desktop. Ela cobre estrutura, semântica, componentes interativos selecionados, Escape, contenção e devolução de foco no modal de blocos. A regra de contraste permanece fora do gate por exigir revisão visual aprovada; a suíte não representa WCAG AA completa. O modal de criação não possui acionador no comportamento atual, embora o formulário reutilizado tenha um ramo interno de criação; nenhum fluxo novo foi inventado apenas para cobertura.
