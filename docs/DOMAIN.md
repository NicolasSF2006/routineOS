# Domínio

## Rotina

Horários válidos usam relógio de 24 horas. Blocos têm tipo fechado, início, fim, duração positiva, ordem e identificadores opcionais de assunto/recorrência. Conflito existe quando `inicioA < fimB && inicioB < fimA`; blocos adjacentes não conflitam.

O construtor opera sobre um rascunho. Cada alteração empilha snapshot (máximo 30), limpa redo e preserva descrição/`repeatSourceId`. Salvar sincroniza recorrências, persiste a rotina e limpa os dois históricos. Sem alteração, salvar fica desabilitado.

## Mentor e rascunho

Uma `preview-routine` é somente prévia. Após confirmação explícita, `propose-routine` é normalizada novamente e armazenada como rascunho. A rotina ativa não muda até o usuário clicar em Salvar no construtor.

## Trilhas

Somente `study`, `project` e `other` geram temas. Agrupamento considera título normalizado, ocorrências, dias e minutos. Regeneração preserva cursos, favoritos, estudados, ocultos, domínio e status de aprendizagem.

## Sessões e calendário

Sessões acumulam estudo ativo, pausas, intervalos de rotina e bônus. O calendário deriva estado a partir da rotina da data, presença, tolerância, sessão e meta. Funções de cálculo ficam em `features/study-session/utils`.

Catálogo pedagógico, normalização de propostas e validadores de storage são detalhes internos separados. IDs, tipos discriminados, chaves persistidas, recorrência e semântica de rascunho continuam contratos do domínio.
