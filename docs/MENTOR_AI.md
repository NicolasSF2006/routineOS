# Mentor IA

## Fluxo

```mermaid
sequenceDiagram
  participant U as Usuário
  participant UI as Chat
  participant API as API Mentor
  participant R as Roteador
  participant P as Provedor
  U->>UI: mensagem
  UI->>API: mensagem + histórico limitado + contexto
  API->>API: valida payload e rate limit
  API->>R: formato interno
  R->>P: prompt comum
  P-->>R: texto externo
  R->>R: parse, reparo e validação da ação
  R-->>UI: reply + ação discriminada
```

No automático: Gemini, Groq, OpenRouter e OpenAI. Falhas temporárias respeitam `Retry-After` e cooldown; 401/403 não avançam no modo manual. Todos usam timeout comum e retornam `MentorApiResponse`.

O parser aceita texto normal ou JSON estruturado, repara controles inválidos em strings e nunca mostra JSON truncado. Quando a mensagem pede a criação de uma rotina, texto livre não é suficiente: o roteador exige uma ação `preview-routine`, tenta novamente com uma instrução compacta e, no modo automático, pode avançar para o próximo provedor. Ações desconhecidas, tipos inventados, horários inválidos, sobreposição não tratada e ações destrutivas são recusados.

Depois de uma prévia estruturada, confirmações curtas como “sim”, “por favor” e “então crie” reutilizam a proposta validada localmente e geram `propose-routine` sem depender de uma nova chamada à IA. Quando uma resposta antiga trouxe apenas uma tabela em texto, uma confirmação curta solicita uma nova prévia estruturada antes de abrir o rascunho.

Logs contêm evento, provedor, duração, status e motivo técnico; nunca chave, cabeçalho, prompt, resposta ou contexto. Métricas locais contam tentativas, sucessos, falhas e duração acumulada.

`/provedores` e o alias `/provedor` fazem uma chamada mínima e isolada para cada API configurada, sem enviar o prompt completo, o histórico ou o contexto do usuário. A verificação pode consumir uma pequena parte da cota, mas não garante que uma geração longa e estruturada terá sucesso. Em erros HTTP, a interface mostra apenas status e uma classificação segura, sem reproduzir mensagens brutas do provedor. Testes automatizados sempre mockam `fetch`.

O corpo é limitado durante a leitura do stream, antes do parse. A validação profunda descarta campos extras e rejeita estruturas, horários, durações, URLs, arrays e profundidade inválidos antes da construção do prompt. O fallback permanece Gemini → Groq → OpenRouter → OpenAI, com seleção manual preservada.
