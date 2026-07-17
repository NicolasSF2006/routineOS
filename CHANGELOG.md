# CHANGELOG

## Não publicado

- Ajustes pedidos sobre uma prévia de rotina agora reutilizam a proposta estruturada em uma solicitação compacta, sem enviar todo o contexto do aplicativo.
- Rotinas customizadas passam a exigir `durationMinutes` em todos os blocos, evitando que horários diferentes sejam substituídos silenciosamente por durações padrão.
- O Mentor mantém a prévia anterior intacta quando não consegue aplicar uma alteração estruturada.

## v1.7.0

- Adicionado modal de boas-vindas com tutorial em etapas para o primeiro acesso.
- Adicionado botão para pular o tutorial e botão final para começar a usar.
- Tutorial passa a aparecer apenas no primeiro acesso, com status salvo no localStorage.
- Adicionado card de Ajuda nas Configurações com opção de ver o tutorial novamente.
- Backup agora inclui o status do tutorial.
- Reset completo remove o status do tutorial para permitir exibição novamente.

## v1.5.0

- Adicionado card de Dados e backup nas Configurações.
- Adicionada exportação de backup completo em JSON.
- Adicionada importação de backup com validação e normalização dos dados.
- Adicionado reset completo dos dados locais com confirmação.
- Adicionada restauração das configurações para os valores padrão.
- Adicionadas notificações internas para atualizar configurações, rotina, histórico e tema após importação/reset.
- Adicionada confirmação antes de limpar a rotina do mês no configurador.

## v1.3.1

- Adicionado drag-and-drop nativo no configurador visual de rotina.
- Blocos da lateral agora podem ser arrastados para qualquer dia da semana.
- Blocos existentes podem ser movidos entre dias e reordenados dentro do mesmo dia.
- Adicionado destaque visual na coluna e no bloco-alvo durante o arraste.
- Mantido o botão de adicionar bloco como alternativa ao drag-and-drop.

## v1.3.0

- Adicionada tela inicial de configuração visual da rotina.
- Adicionada montagem semanal por clique com blocos de tarefa, pausas, almoço, projeto e outro.
- Adicionadas ações de editar, duplicar, excluir e reordenar blocos.
- Adicionados salvamento da semana e repetição da semana para o mês todo.
- A rotina personalizada semanal passa a alimentar a tela inicial e o calendário.

## v1.2.2

- Configurações atualizadas com título centralizado e sem descrição.
- Card de sons ganhou modo de edição com animação de flip.
- Adicionada seleção de som padrão ou áudios importados para cada evento sonoro.
- Adicionado som padrão de sino via Web Audio API.
- Adicionada importação de áudios personalizados com limite de 5 MB.
- Adicionada configuração de início/fim para áudios com mais de 10 segundos.
- Card de Rotina substitui o antigo Modo da rotina e prepara seleção de rotinas personalizadas.
- Removido botão de resetar rotina padrão da interface.

## v1.2.1

- Adicionada navegação semanal com setas.
- Ajustado formato dos dias com nome e número.
- Bloqueado registro de presença em datas passadas ou futuras.
- Removido status separado de cancelado e retomado.
- Ajustada regra de bônus para considerar apenas tempo extra a partir de 2 minutos.
- Removido botão de cancelar após atingir a meta.
- Corrigidos textos e modal de cancelamento.

## v1.2.0

- Ajustada navegação semanal da rotina com domingo a sábado.
- Adicionado suporte visual para dias sem rotina.
- Impedido início de estudos em dias sem rotina.
- Adicionado cancelamento com confirmação.
- Adicionada retomada de dia cancelado preservando tempo estudado.
- Adicionada progressão manual e automática dos blocos da rotina.
- Ajustado calendário com rotina prevista, destaque do dia atual e status cancelado/retomado.
- Ajustado modal de detalhes do dia.

## v1.1.0

- Adicionada persistência da rotina personalizada no localStorage.
- Aplicação passa a carregar a rotina ativa salva quando disponível.
- Adicionado reset da rotina padrão na tela de Configurações.
- Preparação para editor visual de rotina.

## v1.0.2

- Modelagem inicial do domínio do RoutineOS.
- Criação/padronização das entidades de rotina, disciplinas e sessões de estudo.
- Preparação para a futura rotina configurável.
- Roadmap reorganizado por entregas de produto.

## v1.0.1

- Produto oficialmente renomeado para RoutineOS.
- Criado PRODUCT.md.
- Atualizada documentação.
- Atualizada identidade textual do projeto.

## v1.0.0

- Estrutura inicial
- Rotina
- Calendário
- Configurações
- Timer
- Persistência local

## Preparação técnica para publicação — 2026-07-15

- alinhado runtime, tipos e CI em Node 22;
- adicionado limite de payload durante streaming e validação profunda do contexto do Mentor;
- endurecido rate limit com proxy explícito, limite rígido de buckets e cota separada para metadados;
- adicionados thresholds de cobertura e testes de segurança, domínio, provedores e fluxos de navegador;
- ampliadas as matrizes E2E, visual e axe, mantendo contraste documentado fora do gate;
- divididos catálogo da trilha, apresentação de trilhas, validadores de storage, proposta do Mentor e auxiliares do construtor;
- removidos placeholders sem referência e mantidas as chaves atuais de localStorage e backup.
- corrigida a persistência de séries recorrentes, evitando que o salvamento reduzisse uma série semanal a uma única ocorrência;
- estabilizados os testes reais de drag-and-drop, long press, bottom sheet e conclusão de sessão;
- oficializados 51 baselines visuais Linux, 56 cenários E2E, 43 verificações de acessibilidade e 128 testes unitários/de integração;
- isolado o teste de acessibilidade do bottom sheet no projeto mobile e sincronizada a data do SSR com o relógio fixo do Playwright para evitar avisos falsos de hidratação;
- adicionado fechamento por Escape, contenção e devolução de foco no modal de edição de blocos.
- reduzido o `/provedores` a uma verificação mínima por API, sem enviar prompt completo, histórico ou contexto do usuário;
- adicionada distinção segura entre limite temporário e ausência de cota/créditos em respostas HTTP 429 dos provedores.
- exigida uma `preview-routine` válida quando o usuário pede a criação de uma rotina, evitando que tabelas em texto livre sejam tratadas como propostas aplicáveis;
- adicionadas confirmações curtas como “sim”, “por favor” e “então crie” para reutilizar a última prévia estruturada sem nova chamada ao provedor;
- adicionado suporte ao alias `/provedor` e uma mensagem específica quando apenas o teste curto funciona, mas a geração estruturada falha.
