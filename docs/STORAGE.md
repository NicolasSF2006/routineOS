# Armazenamento e migração

O navegador é a fonte de verdade. As chaves existentes em `constants/storage.ts` não devem ser renomeadas. Toda leitura passa por normalização de `unknown`; JSON inválido retorna estado seguro.

O backup atual usa schema 4 e inclui configurações, registros, rotina, tela, tema, onboarding, conversa, trilhas e rascunho do Mentor. Schemas anteriores são normalizados com campos ausentes; versões futuras desconhecidas são rejeitadas. O arquivo de importação é limitado a 25 MB.

## Evolução

1. nunca altere uma chave existente sem leitor legado;
2. aumente `BACKUP_SCHEMA_VERSION` apenas para mudança persistida;
3. aceite o formato anterior e converta para o modelo atual;
4. adicione fixture e teste de ida/volta;
5. recomende backup antes do deploy;
6. não remova dados desconhecidos silenciosamente quando eles puderem ser preservados.

Rollback de código não rebaixa dados automaticamente. Por isso, mudanças de schema devem ser aditivas sempre que possível.

## Estrutura interna

`src/lib/storage.ts` permanece a fachada pública e conserva todas as chaves. `src/lib/storage/storage-validators.ts` concentra normalização de rotina, sessões, configurações, chat e trilhas. O schema de backup continua em 4 e schemas anteriores continuam aceitos pela importação normalizada.
