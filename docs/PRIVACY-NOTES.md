# Notas técnicas de privacidade

Este documento não é política jurídica. Ele lista pontos para uma futura política de privacidade.

Rotina, configurações, sessões, trilhas, conversa e sons personalizados ficam no localStorage do navegador e entram no backup exportado. Ao usar o Mentor com um provedor configurado, mensagem, histórico limitado e resumo dos dados do RoutineOS são processados pelo provedor selecionado ou por outro da ordem de fallback. `/provedores` também envia uma solicitação curta.

Analytics de produção pode processar telemetria técnica conforme a configuração do pacote Vercel Analytics; não deve receber chaves nem conteúdo do Mentor pelo código da aplicação. A futura política deve cobrir provedores, finalidades, retenção, transferências, exclusão local, backups e canais de contato.

Logs de segurança não incluem prompt, mensagens, corpo completo, IP bruto, authorization headers nem URL completa com query sensível. A identificação alternativa do rate limit é hasheada e permanece somente em memória durante a janela.
