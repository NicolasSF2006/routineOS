# CHANGELOG

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
