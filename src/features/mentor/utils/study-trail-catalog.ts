import type {
  FreeStudyResource,
  StudyResourceTopicKey,
} from "@/features/mentor/types"

const MAX_VIDEO_RESOURCES_PER_TOPIC = 4

export const TOPIC_KEYWORDS: Record<StudyResourceTopicKey, string[]> = {
  algorithms: [
    "algoritmo",
    "algoritmos",
    "logica",
    "lógica",
    "estrutura de dados",
    "programacao",
    "programação",
  ],
  backend: ["backend", "back-end", "api", "servidor", "server", "rest", "http"],
  css: ["css", "tailwind", "estilo", "responsivo", "layout", "flex", "grid"],
  database: [
    "banco",
    "banco de dados",
    "database",
    "mongodb",
    "postgres",
    "mysql",
    "sqlite",
    "dados",
  ],
  english: ["ingles", "inglês", "english"],
  mandarin: [
    "mandarim",
    "mandarin",
    "chines",
    "chinês",
    "chinese",
    "hsk",
    "pinyin",
    "hanzi",
  ],
  spanish: ["espanhol", "spanish", "castelhano"],
  frontend: ["frontend", "front-end", "web", "angular"],
  git: ["git", "github", "versionamento", "commit", "pull request", "branch"],
  html: ["html", "semantica", "semântica"],
  javascript: ["javascript", "js", "ecmascript"],
  linux: [
    "linux",
    "terminal",
    "shell",
    "bash",
    "ubuntu",
    "comando",
    "comandos",
  ],
  node: ["node", "nodejs", "node.js", "npm", "express"],
  portuguese: [
    "portugues",
    "português",
    "redacao",
    "redação",
    "escrita",
    "comunicacao",
    "comunicação",
  ],
  python: ["python", "py"],
  react: [
    "react",
    "next",
    "nextjs",
    "next.js",
    "jsx",
    "hook",
    "hooks",
    "componentes",
  ],
  sql: ["sql", "select", "query", "consulta", "consultas", "oracle"],
  typescript: ["typescript", "ts", "tipagem", "types"],
  ux: ["ux", "ui", "figma", "design", "prototipo", "protótipo", "usabilidade"],
}

export interface StudyBlockTopicSource {
  id: string
  title: string
  sourceBlocks: string[]
  days: string[]
  occurrenceCount: number
  totalMinutes: number
  topicKeys: StudyResourceTopicKey[]
}

export interface BroadTopicFocusOption {
  id: string
  label: string
  steps: string[]
  resources: FreeStudyResource[]
  videoResources?: FreeStudyResource[]
}

export interface BroadTopicDefinition {
  id: string
  keywords: string[]
  introSteps: string[]
  focusOptions: BroadTopicFocusOption[]
}

export interface StudyTrailDomainContext {
  definition: BroadTopicDefinition
  focus: BroadTopicFocusOption | null
}

export interface DomainTopicBlueprint {
  id: string
  keywords: string[]
  description: string
  steps: string[]
  projectSuggestion: string
}

export const DOMAIN_CONTEXT_KEYWORDS: Record<string, string[]> = {
  "video-editing": [
    "edicao de video",
    "video editing",
    "davinci resolve",
    "cut page",
    "edit page",
    "fairlight",
    "color page",
    "color grading",
    "premiere",
    "capcut",
  ],
  design: ["design", "identidade visual", "branding", "figma", "ui design"],
}

export const DAVINCI_TOPIC_BLUEPRINTS: DomainTopicBlueprint[] = [
  {
    id: "interface-media",
    keywords: [
      "interface",
      "organizacao de midia",
      "organização de mídia",
      "media pool",
      "bins",
    ],
    description:
      "Aprender a navegar pelo DaVinci Resolve e organizar arquivos de forma que o projeto continue fácil de manter durante toda a edição.",
    steps: [
      "Reconheça as páginas Media, Cut, Edit, Fusion, Color, Fairlight e Deliver e entenda a função de cada uma.",
      "Importe vídeos, áudios e imagens para o Media Pool e organize o material em bins com nomes claros.",
      "Ajuste configurações básicas do projeto, como resolução e taxa de quadros, antes de editar.",
      "Crie um projeto de treino e localize rapidamente cada mídia sem depender da busca do sistema.",
    ],
    projectSuggestion:
      "Crie um projeto de teste, importe pelo menos dez arquivos e organize tudo em bins de vídeo, áudio, imagens e versões finais.",
  },
  {
    id: "cut-page",
    keywords: ["fundamentos de corte", "cut page", "corte"],
    description:
      "Dominar cortes básicos, seleção de trechos e montagem rápida para transformar material bruto em uma sequência compreensível.",
    steps: [
      "Use pontos de entrada e saída para selecionar apenas as partes úteis de cada clipe.",
      "Pratique cortes simples, ripple delete e reorganização de clipes sem deixar espaços na timeline.",
      "Compare cortes secos, cortes por ação e remoção de pausas para perceber como o ritmo muda.",
      "Monte uma sequência curta com começo, desenvolvimento e fechamento usando apenas a Cut Page.",
    ],
    projectSuggestion:
      "Edite uma sequência de 30 a 60 segundos com pelo menos cinco clipes, removendo pausas e mantendo continuidade visual.",
  },
  {
    id: "edit-page-1",
    keywords: [
      "edit page - parte 1",
      "edit page parte 1",
      "edicao na edit page - parte 1",
      "edição na edit page - parte 1",
    ],
    description:
      "Construir uma base sólida na Edit Page, entendendo trilhas, ferramentas de seleção e ajustes essenciais da timeline.",
    steps: [
      "Crie e configure uma timeline adequada ao formato final do vídeo para YouTube.",
      "Pratique seleção, trim, blade, snapping e movimentação de clipes entre trilhas.",
      "Ajuste escala, posição e enquadramento no Inspector sem perder qualidade desnecessariamente.",
      "Organize vídeo principal, B-roll e áudio em trilhas separadas e nomeadas.",
    ],
    projectSuggestion:
      "Monte uma introdução de vídeo para YouTube com fala principal, B-roll e pelo menos um ajuste de enquadramento pelo Inspector.",
  },
  {
    id: "edit-page-2",
    keywords: [
      "edit page - parte 2",
      "edit page parte 2",
      "edicao na edit page - parte 2",
      "edição na edit page - parte 2",
    ],
    description:
      "Aprofundar a montagem na Edit Page com ritmo, títulos, keyframes e recursos que ajudam a sustentar a atenção do espectador.",
    steps: [
      "Refine o ritmo removendo repetições, silêncios excessivos e trechos que não contribuem para o objetivo do vídeo.",
      "Adicione títulos e textos simples respeitando margem, legibilidade e duração na tela.",
      "Use keyframes básicos para criar movimentos discretos de escala, posição ou opacidade.",
      "Revise a sequência completa e verifique se cada corte possui uma função narrativa ou informativa.",
    ],
    projectSuggestion:
      "Crie uma edição de 60 a 90 segundos com títulos, B-roll e dois movimentos simples feitos com keyframes.",
  },
  {
    id: "fairlight",
    keywords: ["audio basico", "áudio básico", "fairlight", "audio"],
    description:
      "Melhorar clareza e consistência do áudio para que voz, música e efeitos permaneçam equilibrados em vídeos para YouTube.",
    steps: [
      "Organize voz, música e efeitos em trilhas separadas antes de começar a mixagem.",
      "Ajuste ganho e volume para manter a fala clara e evitar picos ou trechos baixos demais.",
      "Use fades e automação simples para suavizar entradas, saídas e mudanças de música.",
      "Compare o resultado em fones e alto-falantes comuns antes da exportação.",
    ],
    projectSuggestion:
      "Faça uma mixagem curta com voz e música de fundo, garantindo que a fala permaneça compreensível do início ao fim.",
  },
  {
    id: "color-page",
    keywords: [
      "correcao de cor",
      "correção de cor",
      "color page",
      "color grading",
      "cor basica",
      "cor básica",
    ],
    description:
      "Corrigir exposição, balanço de branco e contraste para obter imagens consistentes antes de aplicar qualquer estilo visual.",
    steps: [
      "Observe waveform e parade para identificar exposição e dominantes de cor.",
      "Corrija balanço de branco, contraste e saturação usando controles primários.",
      "Faça correspondência básica entre dois clipes gravados em condições diferentes.",
      "Compare antes e depois e evite exageros que destruam detalhes nas sombras ou altas luzes.",
    ],
    projectSuggestion:
      "Corrija três clipes diferentes e faça com que pareçam pertencer à mesma cena, salvando uma versão antes/depois.",
  },
  {
    id: "effects-transitions",
    keywords: ["efeitos", "transicoes", "transições", "fusion"],
    description:
      "Usar transições e efeitos com intenção, mantendo a edição clara e evitando elementos que distraiam do conteúdo principal.",
    steps: [
      "Teste cortes secos antes de adicionar transições e mantenha apenas as que ajudam a passagem entre cenas.",
      "Aplique transições simples e ajuste sua duração de acordo com o ritmo do vídeo.",
      "Use efeitos de forma moderada e verifique o impacto no desempenho e no tempo de renderização.",
      "Crie uma pequena composição ou animação simples somente depois que a montagem principal estiver pronta.",
    ],
    projectSuggestion:
      "Edite uma sequência curta usando no máximo duas transições diferentes e justifique visualmente cada escolha.",
  },
  {
    id: "practical-project",
    keywords: ["projeto pratico", "projeto prático", "projeto final"],
    description:
      "Integrar organização, corte, áudio, cor e exportação em uma entrega completa que possa entrar no portfólio ou no canal.",
    steps: [
      "Defina objetivo, público e duração do vídeo antes de selecionar o material.",
      "Monte uma primeira versão priorizando estrutura e clareza, sem tentar polir tudo ao mesmo tempo.",
      "Faça uma segunda passagem para áudio, cor, títulos e pequenos refinamentos.",
      "Exporte, assista ao arquivo final fora do editor e registre o que deve melhorar no próximo projeto.",
    ],
    projectSuggestion:
      "Produza um vídeo completo de 2 a 4 minutos para YouTube e finalize com thumbnail provisória, título e checklist de publicação.",
  },
]

function createFocusResource({
  id,
  title,
  url,
  type = "curso",
  provider,
  language = "pt-BR",
  level = "iniciante-intermediario",
  description,
}: Omit<FreeStudyResource, "topics" | "type" | "language" | "level"> & {
  type?: FreeStudyResource["type"]
  language?: FreeStudyResource["language"]
  level?: FreeStudyResource["level"]
  topics?: StudyResourceTopicKey[]
}): FreeStudyResource {
  return {
    id,
    title,
    url,
    type,
    provider,
    language,
    level,
    topics: [],
    description,
  }
}

interface DomainTopicResourceSet {
  resources: FreeStudyResource[]
  videoResources: FreeStudyResource[]
}

const BLACKMAGIC_TRAINING_URL =
  "https://www.blackmagicdesign.com/products/davinciresolve/training"

const DAVINCI_TOPIC_RESOURCE_SETS: Record<string, DomainTopicResourceSet> = {
  "interface-media": {
    resources: [
      createFocusResource({
        id: "davinci-20-beginners-guide-interface",
        title: "Guia do iniciante — interface e organização",
        url: "https://documents.blackmagicdesign.com/UserManuals/DaVinci-Resolve-20-Beginners-Guide.pdf",
        type: "documentacao",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante",
        description:
          "Guia oficial baseado em projetos para conhecer a interface, criar projetos, importar mídias e organizar o fluxo inicial.",
      }),
      createFocusResource({
        id: "davinci-official-training-interface",
        title: "Treinamento oficial — primeiros passos no DaVinci Resolve",
        url: BLACKMAGIC_TRAINING_URL,
        type: "curso",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante",
        description:
          "Página oficial de treinamento com vídeos, livros e arquivos de aula para começar no DaVinci Resolve.",
      }),
    ],
    videoResources: [
      createFocusResource({
        id: "davinci-introduction-editing-part-1-interface",
        title: "Introduction to Editing — Parte 1",
        url: "https://downloads.blackmagicdesign.com/products/davinciresolve/training/videos/DR17/video-downloads/20250923-xtr312/DaVinci-Resolve-17-Edit-IntroductiontoEditingPart1.zip",
        type: "video",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante",
        description:
          "Vídeo oficial para conhecer o fluxo de edição, a interface e as ferramentas fundamentais.",
      }),
    ],
  },
  "cut-page": {
    resources: [
      createFocusResource({
        id: "davinci-20-editors-guide-cut-page",
        title: "Guia do editor — cortes e montagem",
        url: "https://documents.blackmagicdesign.com/UserManuals/DaVinci-Resolve-20-Editors-Guide.pdf",
        type: "documentacao",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante-intermediario",
        description:
          "Guia oficial prático para cortes, montagem, entrevistas, material documental e entrega final.",
      }),
    ],
    videoResources: [
      createFocusResource({
        id: "davinci-introduction-editing-part-1-cut",
        title: "Introduction to Editing — cortes fundamentais",
        url: "https://downloads.blackmagicdesign.com/products/davinciresolve/training/videos/DR17/video-downloads/20250923-xtr312/DaVinci-Resolve-17-Edit-IntroductiontoEditingPart1.zip",
        type: "video",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante",
        description:
          "Treinamento oficial sobre seleção de trechos, cortes e construção de uma primeira montagem.",
      }),
    ],
  },
  "edit-page-1": {
    resources: [
      createFocusResource({
        id: "davinci-20-editors-guide-timeline",
        title: "Guia do editor — timeline e ferramentas de edição",
        url: "https://documents.blackmagicdesign.com/UserManuals/DaVinci-Resolve-20-Editors-Guide.pdf",
        type: "documentacao",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante-intermediario",
        description:
          "Guia oficial com exercícios de timeline, trim, organização de trilhas e montagem de projetos reais.",
      }),
    ],
    videoResources: [
      createFocusResource({
        id: "davinci-introduction-editing-part-1-edit-page",
        title: "Introduction to Editing — Edit Page Parte 1",
        url: "https://downloads.blackmagicdesign.com/products/davinciresolve/training/videos/DR17/video-downloads/20250923-xtr312/DaVinci-Resolve-17-Edit-IntroductiontoEditingPart1.zip",
        type: "video",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante",
        description:
          "Vídeo oficial para aprender as ferramentas centrais da Edit Page e construir uma montagem inicial.",
      }),
    ],
  },
  "edit-page-2": {
    resources: [
      createFocusResource({
        id: "davinci-20-editors-guide-advanced-edit",
        title: "Guia do editor — refinamento, títulos e entrega",
        url: "https://documents.blackmagicdesign.com/UserManuals/DaVinci-Resolve-20-Editors-Guide.pdf",
        type: "documentacao",
        provider: "Blackmagic Design",
        language: "en",
        level: "intermediario",
        description:
          "Guia oficial para aprofundar trim, ritmo, efeitos, títulos, áudio e preparação para distribuição online.",
      }),
    ],
    videoResources: [
      createFocusResource({
        id: "davinci-introduction-editing-part-2",
        title: "Introduction to Editing — Parte 2",
        url: "https://downloads.blackmagicdesign.com/products/davinciresolve/training/videos/DR17/video-downloads/20211222-xtr312/DaVinci-Resolve-17-Edit-IntroductiontoEditingPart2.zip",
        type: "video",
        provider: "Blackmagic Design",
        language: "en",
        level: "intermediario",
        description:
          "Vídeo oficial sobre refinamento de rough cut, trim, substituição de planos, áudio, efeitos, transições e títulos.",
      }),
    ],
  },
  fairlight: {
    resources: [
      createFocusResource({
        id: "davinci-20-fairlight-audio-guide",
        title: "Guia oficial do Fairlight Audio",
        url: "https://documents.blackmagicdesign.com/UserManuals/DaVinci-Resolve-20-Fairlight-Audio-Post.pdf",
        type: "documentacao",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante-intermediario",
        description:
          "Livro oficial com exercícios de edição de som, limpeza de diálogo, mixagem e masterização no Fairlight.",
      }),
    ],
    videoResources: [
      createFocusResource({
        id: "davinci-fairlight-introduction-audio",
        title: "Introduction to Audio — Fairlight",
        url: "https://downloads.blackmagicdesign.com/products/davinciresolve/training/videos/DR17/video-downloads/20211222-xtr312/DaVinci-Resolve-17-Fairlight-IntroductiontoAudio.zip",
        type: "video",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante",
        description:
          "Vídeo oficial sobre navegação no Fairlight, níveis, edição simples e reparo de diálogo.",
      }),
    ],
  },
  "color-page": {
    resources: [
      createFocusResource({
        id: "davinci-20-colorist-guide",
        title: "Guia oficial do colorista",
        url: "https://documents.blackmagicdesign.com/UserManuals/DaVinci-Resolve-20-Colorist-Guide.pdf",
        type: "documentacao",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante-intermediario",
        description:
          "Guia oficial com exercícios de correção de cor, scopes, nodes e fluxos de color grading.",
      }),
    ],
    videoResources: [
      createFocusResource({
        id: "davinci-color-introduction",
        title: "Introduction to Color — Color Page",
        url: "https://downloads.blackmagicdesign.com/products/davinciresolve/training/videos/DR17/video-downloads/20220210-xtr313/DaVinci-Resolve-17-Color-IntroductiontoColor.zip",
        type: "video",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante",
        description:
          "Vídeo oficial sobre ferramentas primárias e secundárias, scopes, equilíbrio e correspondência de planos.",
      }),
    ],
  },
  "effects-transitions": {
    resources: [
      createFocusResource({
        id: "davinci-20-visual-effects-guide",
        title: "Guia oficial de efeitos visuais no Fusion",
        url: "https://documents.blackmagicdesign.com/UserManuals/DaVinci-Resolve-20-Fusion-Visual-Effects.pdf",
        type: "documentacao",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante-intermediario",
        description:
          "Guia oficial com exercícios de composição, tracking, máscaras, títulos e efeitos visuais no Fusion.",
      }),
    ],
    videoResources: [
      createFocusResource({
        id: "davinci-edit-page-visual-effects",
        title: "Visual Effects in the Edit Page",
        url: "https://downloads.blackmagicdesign.com/products/davinciresolve/training/videos/DR17/video-downloads/20211222-xtr312/DaVinci-Resolve-17-Edit-VisualEffectsintheEditPage.zip",
        type: "video",
        provider: "Blackmagic Design",
        language: "en",
        level: "intermediario",
        description:
          "Vídeo oficial sobre efeitos na Edit Page, chroma key, mattes e substituições simples.",
      }),
      createFocusResource({
        id: "davinci-fusion-introduction",
        title: "Introduction to Fusion",
        url: "https://downloads.blackmagicdesign.com/products/davinciresolve/training/videos/DR17/video-downloads/20211222-xtr312/DaVinci-Resolve-17-Fusion-IntroductiontoFusion.zip",
        type: "video",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante-intermediario",
        description:
          "Vídeo oficial de introdução ao fluxo baseado em nodes, composição, tracking e keying.",
      }),
    ],
  },
  "practical-project": {
    resources: [
      createFocusResource({
        id: "davinci-20-beginners-guide-project",
        title: "Guia do iniciante — projeto completo",
        url: "https://documents.blackmagicdesign.com/UserManuals/DaVinci-Resolve-20-Beginners-Guide.pdf",
        type: "documentacao",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante",
        description:
          "Guia oficial baseado em projetos para integrar edição, cor, áudio, efeitos e exportação.",
      }),
      createFocusResource({
        id: "youtube-creator-academy-project",
        title: "YouTube Creator Academy — publicação do projeto",
        url: "https://creatoracademy.youtube.com/",
        type: "curso",
        provider: "YouTube",
        language: "en",
        level: "iniciante-intermediario",
        description:
          "Conteúdo oficial para revisar apresentação, publicação e desenvolvimento de vídeos para o YouTube.",
      }),
    ],
    videoResources: [
      createFocusResource({
        id: "blackmagic-design-project-channel",
        title: "Blackmagic Design — treinamentos e demonstrações",
        url: "https://www.youtube.com/@BlackmagicDesignOfficial",
        type: "canal",
        provider: "Blackmagic Design",
        language: "en",
        level: "iniciante-intermediario",
        description:
          "Canal oficial para consultar treinamentos e demonstrações ao finalizar o projeto prático.",
      }),
    ],
  },
}

export function getDomainTopicResourceSet(
  blueprint: DomainTopicBlueprint | null,
): DomainTopicResourceSet | null {
  if (!blueprint) return null
  return DAVINCI_TOPIC_RESOURCE_SETS[blueprint.id] ?? null
}

export const BROAD_TOPIC_DEFINITIONS: BroadTopicDefinition[] = [
  {
    id: "video-editing",
    keywords: [
      "edicao de video",
      "edição de vídeo",
      "video editing",
      "editar video",
      "editar vídeo",
    ],
    introSteps: [
      "Defina primeiro qual tipo de vídeo você quer editar: aula, vlog, corte curto, vídeo para YouTube ou peça de portfólio.",
      "Estude fundamentos comuns: cortes, ritmo, continuidade, organização de arquivos e áudio limpo.",
      "Faça uma edição curta por semana para criar repertório prático sem depender só de teoria.",
    ],
    focusOptions: [
      {
        id: "youtube",
        label: "YouTube",
        steps: [
          "Estude estrutura de vídeo: gancho inicial, desenvolvimento, cortes de respiro e fechamento.",
          "Pratique cortes que removem pausas longas sem perder naturalidade.",
          "Crie um vídeo curto com introdução, desenvolvimento, tela final e áudio consistente.",
          "Revise retenção visual: variação de planos, zooms leves, textos e B-roll quando fizer sentido.",
        ],
        resources: [
          createFocusResource({
            id: "youtube-creators-editing",
            title: "YouTube Creators",
            url: "https://www.youtube.com/creators/",
            type: "plataforma",
            provider: "YouTube",
            language: "en",
            description:
              "Guias oficiais para criação, edição, crescimento e boas práticas de vídeos no YouTube.",
          }),
          createFocusResource({
            id: "youtube-creator-academy",
            title: "YouTube Creator Academy",
            url: "https://creatoracademy.youtube.com/",
            type: "curso",
            provider: "YouTube",
            language: "en",
            description:
              "Conteúdos de apoio para criação de vídeos, público, retenção e planejamento de canal.",
          }),
        ],
      },
      {
        id: "short-form",
        label: "Reels/TikTok",
        steps: [
          "Treine cortes rápidos com início forte nos primeiros segundos.",
          "Use legendas, ritmo visual e cortes objetivos para manter atenção.",
          "Edite uma sequência curta reaproveitando o mesmo material em formatos diferentes.",
        ],
        resources: [
          createFocusResource({
            id: "tiktok-creator-portal",
            title: "TikTok Creator Portal",
            url: "https://www.tiktok.com/creators/creator-portal/",
            type: "plataforma",
            provider: "TikTok",
            language: "en",
            description:
              "Guias para criação de conteúdo curto, storytelling, comunidade e formato vertical.",
          }),
          createFocusResource({
            id: "instagram-creators",
            title: "Instagram Creators",
            url: "https://creators.instagram.com/",
            type: "plataforma",
            provider: "Instagram",
            language: "en",
            description:
              "Orientações de criação para Reels, formatos, comunidade e boas práticas de conteúdo.",
          }),
        ],
      },
      {
        id: "davinci-resolve",
        label: "DaVinci Resolve",
        steps: [
          "Aprenda a interface, a linha do tempo, importação de mídia e exportação básica.",
          "Pratique cortes, organização por bins e ajustes simples de áudio.",
          "Estude correção de cor básica antes de tentar color grading avançado.",
          "Monte um vídeo curto completo usando apenas mídia simples e exporte em formato final.",
        ],
        resources: [
          createFocusResource({
            id: "blackmagic-resolve-training",
            title: "DaVinci Resolve Training",
            url: "https://www.blackmagicdesign.com/products/davinciresolve/training",
            type: "curso",
            provider: "Blackmagic Design",
            language: "en",
            description:
              "Materiais oficiais gratuitos de treinamento para edição, cor, áudio e efeitos no DaVinci Resolve.",
          }),
          createFocusResource({
            id: "blackmagic-resolve-manual",
            title: "DaVinci Resolve Reference Manual",
            url: "https://documents.blackmagicdesign.com/UserManuals/DaVinci_Resolve_Reference_Manual.pdf",
            type: "documentacao",
            provider: "Blackmagic Design",
            language: "en",
            description:
              "Manual oficial para consultar ferramentas e fluxos de trabalho do DaVinci Resolve.",
          }),
        ],
      },
      {
        id: "premiere",
        label: "Premiere",
        steps: [
          "Estude organização de projeto, timeline, cortes, transições simples e exportação.",
          "Pratique edição de áudio e correção básica de cor antes de efeitos avançados.",
          "Crie um vídeo curto usando cortes, trilha sonora e legendas simples.",
        ],
        resources: [
          createFocusResource({
            id: "adobe-premiere-tutorials",
            title: "Adobe Premiere Pro Tutorials",
            url: "https://helpx.adobe.com/premiere-pro/tutorials.html",
            type: "curso",
            provider: "Adobe",
            language: "en",
            description:
              "Tutoriais oficiais para aprender fluxos básicos e intermediários no Premiere Pro.",
          }),
          createFocusResource({
            id: "adobe-premiere-user-guide",
            title: "Premiere Pro User Guide",
            url: "https://helpx.adobe.com/premiere-pro/user-guide.html",
            type: "documentacao",
            provider: "Adobe",
            language: "en",
            description:
              "Guia oficial para consultar ferramentas, exportação, edição e organização no Premiere Pro.",
          }),
        ],
      },
      {
        id: "capcut",
        label: "CapCut",
        steps: [
          "Aprenda importação, cortes, legendas, áudio e exportação em formato vertical.",
          "Treine uma edição curta usando legendas, cortes rápidos e ajuste de ritmo.",
          "Crie variações do mesmo vídeo para testar estilos diferentes.",
        ],
        resources: [
          createFocusResource({
            id: "capcut-learning",
            title: "CapCut Learning",
            url: "https://www.capcut.com/learning",
            type: "curso",
            provider: "CapCut",
            language: "en",
            description:
              "Materiais e guias oficiais para aprender ferramentas e fluxos de edição no CapCut.",
          }),
        ],
      },
      {
        id: "color-grading",
        label: "Color grading",
        steps: [
          "Revise exposição, contraste, balanço de branco e saturação antes de estilos avançados.",
          "Compare antes/depois para entender como cor muda a sensação do vídeo.",
          "Crie três versões de cor para o mesmo clipe e escolha a mais coerente com o objetivo.",
        ],
        resources: [
          createFocusResource({
            id: "blackmagic-color-training",
            title: "DaVinci Resolve Color Training",
            url: "https://www.blackmagicdesign.com/products/davinciresolve/training",
            type: "curso",
            provider: "Blackmagic Design",
            language: "en",
            description:
              "Treinamentos oficiais gratuitos com foco em cor e finalização no DaVinci Resolve.",
          }),
        ],
      },
    ],
  },
  {
    id: "design",
    keywords: [
      "design",
      "identidade visual",
      "logo",
      "logotipo",
      "branding",
      "ui design",
    ],
    introSteps: [
      "Defina se o foco é design gráfico, identidade visual, UI, produto ou composição visual.",
      "Estude fundamentos comuns: contraste, hierarquia, alinhamento, espaçamento e consistência.",
      "Recrie referências boas para entender decisões de layout antes de criar do zero.",
    ],
    focusOptions: [
      {
        id: "ui-design",
        label: "UI design",
        steps: [
          "Estude hierarquia visual, espaçamento, contraste, tipografia e estados de componente.",
          "Recrie uma tela simples e depois adapte para mobile.",
          "Monte um mini design system com botões, cards, inputs e cores.",
        ],
        resources: [
          createFocusResource({
            id: "figma-learn-ui",
            title: "Figma Learn",
            url: "https://www.figma.com/resources/learn-design/",
            type: "curso",
            provider: "Figma",
            language: "en",
            description:
              "Materiais gratuitos para fundamentos de design, ferramentas e fluxos de UI.",
          }),
          createFocusResource({
            id: "material-design",
            title: "Material Design",
            url: "https://m3.material.io/",
            type: "documentacao",
            provider: "Google",
            language: "en",
            description:
              "Sistema de design com princípios, componentes, padrões e acessibilidade.",
          }),
        ],
      },
      {
        id: "branding",
        label: "Identidade visual",
        steps: [
          "Estude propósito da marca, referências visuais, paleta, tipografia e aplicações.",
          "Crie moodboard e versões simples antes de detalhar materiais finais.",
          "Monte um guia curto com logo, cores, fontes e exemplos de uso.",
        ],
        resources: [
          createFocusResource({
            id: "canva-design-school",
            title: "Canva Design School",
            url: "https://www.canva.com/designschool/",
            type: "curso",
            provider: "Canva",
            language: "en",
            description:
              "Aulas e guias gratuitos sobre composição, branding e criação visual.",
          }),
        ],
      },
    ],
  },
]

const BROAD_FOCUS_VIDEO_RESOURCES: Record<string, FreeStudyResource[]> = {
  "video-editing:youtube": [
    createFocusResource({
      id: "peter-jordan-creators",
      title: "Peter Jordan — criadores de conteúdo",
      url: "https://www.youtube.com/results?search_query=Peter+Jordan+criadores+de+conte%C3%BAdo",
      type: "playlist",
      provider: "Peter Jordan",
      language: "pt-BR",
      description:
        "Busca curada para encontrar conteúdos do Peter Jordan sobre bastidores, estratégia e crescimento de canais.",
    }),
    createFocusResource({
      id: "think-media-youtube",
      title: "Think Media",
      url: "https://www.youtube.com/@ThinkMediaTV",
      type: "canal",
      provider: "Think Media",
      language: "en",
      description:
        "Canal com dicas de criacao, estrutura, gravacao e edicao para videos de YouTube.",
    }),
  ],
  "video-editing:short-form": [
    createFocusResource({
      id: "capcut-youtube-shorts",
      title: "CapCut",
      url: "https://www.youtube.com/@CapCutofficial",
      type: "canal",
      provider: "CapCut",
      language: "en",
      description:
        "Canal oficial com exemplos e tutoriais para edicoes curtas, legendas, ritmo e formatos verticais.",
    }),
    createFocusResource({
      id: "instagram-creators-youtube",
      title: "Instagram for Creators",
      url: "https://www.youtube.com/@Creators",
      type: "canal",
      provider: "Instagram",
      language: "en",
      description:
        "Conteudos de apoio para criacao de Reels, formatos curtos e boas praticas de criadores.",
    }),
  ],
  "video-editing:davinci-resolve": [
    createFocusResource({
      id: "blackmagic-design-youtube",
      title: "Blackmagic Design",
      url: "https://www.youtube.com/@BlackmagicDesignOfficial",
      type: "canal",
      provider: "Blackmagic Design",
      language: "en",
      description:
        "Canal oficial com tutoriais, treinamentos e demonstracoes do DaVinci Resolve.",
    }),
    createFocusResource({
      id: "casey-faris-davinci",
      title: "Casey Faris",
      url: "https://www.youtube.com/@CaseyFaris",
      type: "canal",
      provider: "Casey Faris",
      language: "en",
      description:
        "Canal com tutoriais praticos de DaVinci Resolve, edicao, Fusion, cor e audio.",
    }),
  ],
  "video-editing:premiere": [
    createFocusResource({
      id: "adobe-creative-cloud-youtube",
      title: "Adobe Creative Cloud",
      url: "https://www.youtube.com/@AdobeCreativeCloud",
      type: "canal",
      provider: "Adobe",
      language: "en",
      description:
        "Canal oficial com tutoriais e fluxos de trabalho para Premiere Pro e criacao audiovisual.",
    }),
    createFocusResource({
      id: "premiere-gal-youtube",
      title: "Premiere Gal",
      url: "https://www.youtube.com/@PremiereGal",
      type: "canal",
      provider: "Premiere Gal",
      language: "en",
      description:
        "Canal com tutoriais de Premiere, edicao, motion simples, texto, audio e produtividade.",
    }),
  ],
  "video-editing:capcut": [
    createFocusResource({
      id: "capcut-official-youtube",
      title: "CapCut",
      url: "https://www.youtube.com/@CapCutofficial",
      type: "canal",
      provider: "CapCut",
      language: "en",
      description:
        "Canal oficial com tutoriais e exemplos de uso do CapCut para edicoes rapidas e conteudo vertical.",
    }),
  ],
  "video-editing:color-grading": [
    createFocusResource({
      id: "blackmagic-design-color-youtube",
      title: "Blackmagic Design",
      url: "https://www.youtube.com/@BlackmagicDesignOfficial",
      type: "canal",
      provider: "Blackmagic Design",
      language: "en",
      description:
        "Canal oficial com conteudos sobre DaVinci Resolve, cor, finalizacao e fluxos profissionais.",
    }),
    createFocusResource({
      id: "cullen-kelly-youtube",
      title: "Cullen Kelly",
      url: "https://www.youtube.com/@CullenKelly",
      type: "canal",
      provider: "Cullen Kelly",
      language: "en",
      description:
        "Canal focado em color grading, cor cinematografica e fluxo de trabalho no DaVinci Resolve.",
    }),
  ],
  "design:ui-design": [
    createFocusResource({
      id: "figma-youtube-focus",
      title: "Figma",
      url: "https://www.youtube.com/@Figma",
      type: "canal",
      provider: "Figma",
      language: "en",
      description:
        "Canal oficial com tutoriais, praticas e fluxos de UI design no Figma.",
    }),
    createFocusResource({
      id: "nngroup-youtube-focus",
      title: "Nielsen Norman Group",
      url: "https://www.youtube.com/@NNgroup",
      type: "canal",
      provider: "Nielsen Norman Group",
      language: "en",
      description:
        "Canal com explicacoes sobre UX, usabilidade, pesquisa e design centrado no usuario.",
    }),
  ],
  "design:branding": [
    createFocusResource({
      id: "canva-youtube",
      title: "Canva",
      url: "https://www.youtube.com/@canva",
      type: "canal",
      provider: "Canva",
      language: "en",
      description:
        "Canal com tutoriais e ideias para composicao visual, branding e criacao de pecas graficas.",
    }),
    createFocusResource({
      id: "the-futur-youtube",
      title: "The Futur",
      url: "https://www.youtube.com/@thefutur",
      type: "canal",
      provider: "The Futur",
      language: "en",
      description:
        "Canal com conteudos sobre identidade visual, marca, design grafico, portfolio e processo criativo.",
    }),
  ],
}

export function getBroadFocusVideoResources(
  definitionId: string,
  focusId: string,
): FreeStudyResource[] {
  return (
    BROAD_FOCUS_VIDEO_RESOURCES[`${definitionId}:${focusId}`] ?? []
  ).slice(0, MAX_VIDEO_RESOURCES_PER_TOPIC)
}
