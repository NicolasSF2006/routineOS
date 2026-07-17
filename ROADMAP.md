# ROADMAP

## Visão de Longo Prazo

- Estudos
- Projetos
- Roadmap
- IA
- Biblioteca
- Estatísticas
- Hábitos
- Objetivos
- Carreira

## Sprint 0 — Arquitetura

- Organização por features.
- Separação de componentes.
- Centralização de tipos, constantes e utils.

## Sprint 0.5 — Identidade

- Produto renomeado para RoutineOS.
- Criação do PRODUCT.md.
- Atualização da identidade textual.

## Sprint 0.75 — Modelagem do Domínio

- Criação das entidades centrais.
- Padronização da rotina padrão.
- Preparação para rotina configurável.

## Sprint 1 — Rotina Configurável

### Sprint 1.1 — Persistência da Rotina Personalizada

- Carregar rotina personalizada do localStorage quando disponível.
- Usar a rotina ativa como fonte de verdade para rotina e calendário.
- Resetar rotina personalizada sem apagar registros de estudo.
- Preparar base para editor visual de rotina.

### Sprint 1.2 — Editor Visual da Rotina

- Edição de blocos.
- Edição de dias da semana.
- Persistência da rotina personalizada.

### Sprint 1.2A — Ajustes de Rotina, Controle e Calendário

- Navegação semanal completa de domingo a sábado.
- Dias sem rotina tratados na Rotina, Controle de estudos e Calendário.
- Cancelamento e retomada de dia de aula preservando histórico.
- Progressão manual e automática dos blocos da rotina.
- Calendário com rotina prevista, hoje em destaque e status cancelado/retomado.

## Sprint 2 — Estatísticas

- Métricas mais completas.
- Visão semanal e mensal.
- Evolução por disciplina.

## Sprint 3 — Diário de Estudos

- Registro de aprendizado diário.
- Dificuldades.
- Revisões futuras.

## Sprint 4 — Backup

- Exportar dados.
- Importar dados.
- Preparar persistência futura.

## Sprint 5 — Roadmap e Biblioteca

- Disciplinas como entidades.
- Links úteis.
- Progresso de cursos.

## Sprint 6 — IA Mentora

- Assistente de estudos.
- Sugestões de revisão.
- Links e exercícios.

## Dívida técnica pós-preparação

- concluir a divisão do JSX responsivo do construtor após ampliar testes de componentes;
- aprovar ajustes de paleta e reativar contraste no gate axe;
- avaliar baselines adicionais para macOS e Windows apenas quando houver necessidade de execução local equivalente;
- adotar store distribuído de rate limit somente quando houver múltiplas réplicas;
- expor um acionador de criação por modal apenas se isso virar decisão de produto.
