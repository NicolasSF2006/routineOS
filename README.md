# RoutineOS

RoutineOS é um sistema operacional para organização da evolução pessoal, começando pela rotina de estudos.

A aplicação organiza rotina de estudos, acompanha presença diária, controla tempo estudado com pausas, exibe progresso no calendário e mantém preferências locais.

## Tecnologias Utilizadas

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/base-ui
- lucide-react
- LocalStorage para persistência local
- Vercel Analytics em produção

## Como Executar

Instale as dependências:

```bash
npm install
```

Execute o ambiente de desenvolvimento:

```bash
npm run dev
```

Acesse:

```txt
http://localhost:3000
```

## Comandos Úteis

```bash
npm run typecheck
npm run build
npm run start
```

## Estrutura do Projeto

```txt
src/
  app/                         Rotas e layout raiz do Next.js
  components/
    layout/                    Componentes de layout global
    providers/                 Providers React globais
    shared/                    Componentes compartilhados entre features
    ui/                        Primitivos de interface
  constants/                   Valores fixos reutilizáveis
  features/
    calendar/                  Calendário, estatísticas e detalhes do dia
    routine/                   Rotina semanal e blocos de estudo
    settings/                  Configurações da aplicação
    study-session/             Controle e regras da sessão de estudo
  hooks/                       Hooks globais reutilizáveis
  lib/                         Infraestrutura e helpers base
  styles/                      Estilos globais
  types/                       Tipos compartilhados
  utils/                       Funções puras de data, horário e formatação
```

## Próximos Passos

- Ampliar testes automatizados das regras de sessão e calendário.
- Evoluir a edição da rotina sem acoplar UI e regras de negócio.
- Revisar acessibilidade dos fluxos principais.
- Preparar estratégia de migração caso a persistência deixe de ser local.
