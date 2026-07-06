# RoutineOS

**RoutineOS** é uma aplicação web para organização e acompanhamento de rotinas de estudo.

O projeto permite configurar rotinas semanais e mensais, acompanhar sessões de estudo, visualizar progresso em calendário, personalizar sons e manter os dados protegidos por backup local.

🔗 **Deploy:** https://routineos-app.vercel.app/  
📦 **Repositório:** https://github.com/NicolasSF2006/routineOS

---

## Sobre o projeto

O RoutineOS foi desenvolvido com o objetivo de transformar a organização dos estudos em uma experiência mais visual, prática e personalizável.

A aplicação funciona diretamente no navegador, utilizando persistência local para salvar rotinas, histórico, configurações, preferências de tema, sons personalizados e backups. O foco do projeto é oferecer uma experiência simples para o usuário, mas com funcionalidades completas o suficiente para uso real no dia a dia.

---

## Funcionalidades principais

- Criação de rotinas de estudo por semana e mês.
- Configurador visual de rotina com blocos personalizados.
- Drag-and-drop para organizar tarefas, pausas, almoço, projetos e outros blocos.
- Controle de sessão de estudo com início, pausa, conclusão, cancelamento e retomada.
- Modo automático ou manual para avanço entre tarefas.
- Calendário com histórico e status dos dias.
- Configurações de aparência e tema.
- Personalização de sons da rotina.
- Importação de áudios personalizados.
- Exportação e importação de backup em JSON.
- Reset completo dos dados locais.
- Tutorial inicial para novos usuários.
- Persistência da última tela acessada.
- Interface responsiva para desktop, tablet e mobile.

---

## Tecnologias utilizadas

- Next.js
- React
- TypeScript
- Tailwind CSS
- LocalStorage
- Vercel

---

## Estrutura geral

```txt
src/
├── app/
├── components/
│   ├── layout/
│   ├── providers/
│   ├── shared/
│   └── ui/
├── constants/
├── features/
│   ├── calendar/
│   ├── onboarding/
│   ├── routine/
│   ├── routine-builder/
│   ├── settings/
│   └── study-session/
├── lib/
├── styles/
└── types/
```

---

## Como rodar localmente

Clone o repositório:

```bash
git clone https://github.com/NicolasSF2006/routineOS.git
```

Entre na pasta do projeto:

```bash
cd routineOS
```

Instale as dependências:

```bash
npm install
```

Rode o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse no navegador:

```txt
http://localhost:3000
```

---

## Scripts disponíveis

```bash
npm run dev
```

Inicia o ambiente de desenvolvimento.

```bash
npm run build
```

Gera a versão de produção.

```bash
npm run typecheck
```

Executa a verificação de tipos do TypeScript.

---

## Persistência de dados

O RoutineOS utiliza `localStorage` para armazenar os dados no próprio navegador do usuário.

São salvos localmente:

- rotina ativa;
- histórico de estudos;
- configurações;
- tema;
- sons personalizados;
- última tela acessada;
- status do tutorial inicial.

A aplicação também possui recursos de **exportação** e **importação de backup**, permitindo que o usuário salve seus dados em um arquivo `.json`.

---

## Status do projeto

Versão atual: **MVP v1.0.0**

O projeto já possui as principais funcionalidades implementadas e está em fase de refinamento para apresentação em portfólio.

---

## Próximas melhorias possíveis

- Rotinas modelo para novos usuários.
- Melhorias de acessibilidade.
- Relatórios mais detalhados de desempenho.
- Estatísticas semanais e mensais avançadas.
- Sincronização em nuvem.
- Login de usuário.
- Integração com notificações.

---

## Autor

Desenvolvido por **Nicolas Silva Frazão**.

GitHub: https://github.com/NicolasSF2006
