import {
  FREE_STUDY_RESOURCES,
  FREE_STUDY_VIDEO_RESOURCES,
} from "@/features/mentor/data/free-study-resources"
import type {
  FreeStudyResource,
  MentorContext,
  MentorContextBlock,
  StudyResourceTopicKey,
  StudyTopicFocusOption,
  StudyTrail,
  StudyTrailTopic,
} from "@/features/mentor/types"

const MAX_RESOURCES_PER_TOPIC = 5
const MAX_VIDEO_RESOURCES_PER_TOPIC = 4
const MAX_TRAIL_TOPICS = 60

const STUDY_BLOCK_TYPES = ["study", "project", "other"] as const

const TOPIC_KEYWORDS: Record<StudyResourceTopicKey, string[]> = {
  algorithms: ["algoritmo", "algoritmos", "logica", "lógica", "estrutura de dados", "programacao", "programação"],
  backend: ["backend", "back-end", "api", "servidor", "server", "rest", "http"],
  css: ["css", "tailwind", "estilo", "responsivo", "layout", "flex", "grid"],
  database: ["banco", "banco de dados", "database", "mongodb", "postgres", "mysql", "sqlite", "dados"],
  english: ["ingles", "inglês", "english"],
  mandarin: ["mandarim", "mandarin", "chines", "chinês", "chinese", "hsk", "pinyin", "hanzi"],
  spanish: ["espanhol", "spanish", "castelhano"],
  frontend: ["frontend", "front-end", "web", "interface", "ui", "angular"],
  git: ["git", "github", "versionamento", "commit", "pull request", "branch"],
  html: ["html", "semantica", "semântica"],
  javascript: ["javascript", "js", "ecmascript"],
  linux: ["linux", "terminal", "shell", "bash", "ubuntu", "comando", "comandos"],
  node: ["node", "nodejs", "node.js", "npm", "express"],
  portuguese: ["portugues", "português", "redacao", "redação", "escrita", "comunicacao", "comunicação"],
  python: ["python", "py"],
  react: ["react", "next", "nextjs", "next.js", "jsx", "hook", "hooks", "componentes"],
  sql: ["sql", "select", "query", "consulta", "consultas", "oracle"],
  typescript: ["typescript", "ts", "tipagem", "types"],
  ux: ["ux", "ui", "figma", "design", "prototipo", "protótipo", "usabilidade"],
}

interface StudyBlockTopicSource {
  id: string
  title: string
  sourceBlocks: string[]
  days: string[]
  occurrenceCount: number
  totalMinutes: number
  topicKeys: StudyResourceTopicKey[]
}


interface BroadTopicFocusOption {
  id: string
  label: string
  steps: string[]
  resources: FreeStudyResource[]
  videoResources?: FreeStudyResource[]
}

interface BroadTopicDefinition {
  id: string
  keywords: string[]
  introSteps: string[]
  focusOptions: BroadTopicFocusOption[]
}

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

const BROAD_TOPIC_DEFINITIONS: BroadTopicDefinition[] = [
  {
    id: "video-editing",
    keywords: ["edicao de video", "edição de vídeo", "video editing", "editar video", "editar vídeo"],
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
            description: "Guias oficiais para criação, edição, crescimento e boas práticas de vídeos no YouTube.",
          }),
          createFocusResource({
            id: "youtube-creator-academy",
            title: "YouTube Creator Academy",
            url: "https://creatoracademy.youtube.com/",
            type: "curso",
            provider: "YouTube",
            language: "en",
            description: "Conteúdos de apoio para criação de vídeos, público, retenção e planejamento de canal.",
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
            description: "Guias para criação de conteúdo curto, storytelling, comunidade e formato vertical.",
          }),
          createFocusResource({
            id: "instagram-creators",
            title: "Instagram Creators",
            url: "https://creators.instagram.com/",
            type: "plataforma",
            provider: "Instagram",
            language: "en",
            description: "Orientações de criação para Reels, formatos, comunidade e boas práticas de conteúdo.",
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
            description: "Materiais oficiais gratuitos de treinamento para edição, cor, áudio e efeitos no DaVinci Resolve.",
          }),
          createFocusResource({
            id: "blackmagic-resolve-manual",
            title: "DaVinci Resolve Reference Manual",
            url: "https://documents.blackmagicdesign.com/UserManuals/DaVinci_Resolve_Reference_Manual.pdf",
            type: "documentacao",
            provider: "Blackmagic Design",
            language: "en",
            description: "Manual oficial para consultar ferramentas e fluxos de trabalho do DaVinci Resolve.",
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
            description: "Tutoriais oficiais para aprender fluxos básicos e intermediários no Premiere Pro.",
          }),
          createFocusResource({
            id: "adobe-premiere-user-guide",
            title: "Premiere Pro User Guide",
            url: "https://helpx.adobe.com/premiere-pro/user-guide.html",
            type: "documentacao",
            provider: "Adobe",
            language: "en",
            description: "Guia oficial para consultar ferramentas, exportação, edição e organização no Premiere Pro.",
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
            description: "Materiais e guias oficiais para aprender ferramentas e fluxos de edição no CapCut.",
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
            description: "Treinamentos oficiais gratuitos com foco em cor e finalização no DaVinci Resolve.",
          }),
        ],
      },
    ],
  },
  {
    id: "design",
    keywords: ["design", "identidade visual", "logo", "logotipo", "branding", "ui design"],
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
            description: "Materiais gratuitos para fundamentos de design, ferramentas e fluxos de UI.",
          }),
          createFocusResource({
            id: "material-design",
            title: "Material Design",
            url: "https://m3.material.io/",
            type: "documentacao",
            provider: "Google",
            language: "en",
            description: "Sistema de design com princípios, componentes, padrões e acessibilidade.",
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
            description: "Aulas e guias gratuitos sobre composição, branding e criação visual.",
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
      description: "Busca curada para encontrar conteúdos do Peter Jordan sobre bastidores, estratégia e crescimento de canais.",
    }),
    createFocusResource({
      id: "think-media-youtube",
      title: "Think Media",
      url: "https://www.youtube.com/@ThinkMediaTV",
      type: "canal",
      provider: "Think Media",
      language: "en",
      description: "Canal com dicas de criacao, estrutura, gravacao e edicao para videos de YouTube.",
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
      description: "Canal oficial com exemplos e tutoriais para edicoes curtas, legendas, ritmo e formatos verticais.",
    }),
    createFocusResource({
      id: "instagram-creators-youtube",
      title: "Instagram for Creators",
      url: "https://www.youtube.com/@Creators",
      type: "canal",
      provider: "Instagram",
      language: "en",
      description: "Conteudos de apoio para criacao de Reels, formatos curtos e boas praticas de criadores.",
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
      description: "Canal oficial com tutoriais, treinamentos e demonstracoes do DaVinci Resolve.",
    }),
    createFocusResource({
      id: "casey-faris-davinci",
      title: "Casey Faris",
      url: "https://www.youtube.com/@CaseyFaris",
      type: "canal",
      provider: "Casey Faris",
      language: "en",
      description: "Canal com tutoriais praticos de DaVinci Resolve, edicao, Fusion, cor e audio.",
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
      description: "Canal oficial com tutoriais e fluxos de trabalho para Premiere Pro e criacao audiovisual.",
    }),
    createFocusResource({
      id: "premiere-gal-youtube",
      title: "Premiere Gal",
      url: "https://www.youtube.com/@PremiereGal",
      type: "canal",
      provider: "Premiere Gal",
      language: "en",
      description: "Canal com tutoriais de Premiere, edicao, motion simples, texto, audio e produtividade.",
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
      description: "Canal oficial com tutoriais e exemplos de uso do CapCut para edicoes rapidas e conteudo vertical.",
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
      description: "Canal oficial com conteudos sobre DaVinci Resolve, cor, finalizacao e fluxos profissionais.",
    }),
    createFocusResource({
      id: "cullen-kelly-youtube",
      title: "Cullen Kelly",
      url: "https://www.youtube.com/@CullenKelly",
      type: "canal",
      provider: "Cullen Kelly",
      language: "en",
      description: "Canal focado em color grading, cor cinematografica e fluxo de trabalho no DaVinci Resolve.",
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
      description: "Canal oficial com tutoriais, praticas e fluxos de UI design no Figma.",
    }),
    createFocusResource({
      id: "nngroup-youtube-focus",
      title: "Nielsen Norman Group",
      url: "https://www.youtube.com/@NNgroup",
      type: "canal",
      provider: "Nielsen Norman Group",
      language: "en",
      description: "Canal com explicacoes sobre UX, usabilidade, pesquisa e design centrado no usuario.",
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
      description: "Canal com tutoriais e ideias para composicao visual, branding e criacao de pecas graficas.",
    }),
    createFocusResource({
      id: "the-futur-youtube",
      title: "The Futur",
      url: "https://www.youtube.com/@thefutur",
      type: "canal",
      provider: "The Futur",
      language: "en",
      description: "Canal com conteudos sobre identidade visual, marca, design grafico, portfolio e processo criativo.",
    }),
  ],
}

function getBroadFocusVideoResources(definitionId: string, focusId: string): FreeStudyResource[] {
  return (BROAD_FOCUS_VIDEO_RESOURCES[`${definitionId}:${focusId}`] ?? []).slice(0, MAX_VIDEO_RESOURCES_PER_TOPIC)
}


function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeResourceUrl(url: string): string {
  return url.toLowerCase().replace(/\/$/, "")
}

function areResourcesEquivalent(resource: FreeStudyResource, comparedResource: FreeStudyResource): boolean {
  const resourceUrl = normalizeResourceUrl(resource.url)
  const comparedUrl = normalizeResourceUrl(comparedResource.url)
  if (resourceUrl === comparedUrl) return true

  const resourceTitle = normalizeText(resource.title)
  const comparedTitle = normalizeText(comparedResource.title)
  if (resourceTitle.length > 0 && resourceTitle === comparedTitle) return true

  const resourceProvider = normalizeText(resource.provider)
  const comparedProvider = normalizeText(comparedResource.provider)
  if (resourceProvider.length === 0 || comparedProvider.length === 0) return false

  return resourceProvider === comparedProvider && (
    resourceTitle.includes(comparedTitle) || comparedTitle.includes(resourceTitle)
  )
}

function dedupeResources(
  resources: FreeStudyResource[],
  excludedResources: FreeStudyResource[] = [],
): FreeStudyResource[] {
  return resources.filter((resource, resourceIndex) => {
    const duplicatedBefore = resources
      .slice(0, resourceIndex)
      .some((comparedResource) => areResourcesEquivalent(resource, comparedResource))

    if (duplicatedBefore) return false

    return !excludedResources.some((excludedResource) => areResourcesEquivalent(resource, excludedResource))
  })
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

export function createTopicId(title: string): string {
  return normalizeText(title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tema"
}

export function isStudyTrailBlock(block: Pick<MentorContextBlock, "type">): boolean {
  return STUDY_BLOCK_TYPES.includes(block.type as (typeof STUDY_BLOCK_TYPES)[number])
}

function inferTopicKeys(title: string): StudyResourceTopicKey[] {
  const normalized = normalizeText(title)
  const matches = Object.entries(TOPIC_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(normalizeText(keyword))))
    .map(([topic]) => topic as StudyResourceTopicKey)

  if (matches.includes("react") && !matches.includes("javascript")) matches.push("javascript")
  if (matches.includes("node") && !matches.includes("backend")) matches.push("backend")
  if (matches.includes("sql") && !matches.includes("database")) matches.push("database")
  if ((matches.includes("html") || matches.includes("css") || matches.includes("javascript")) && !matches.includes("frontend")) {
    matches.push("frontend")
  }

  return uniq(matches)
}

function pickResources(topicKeys: StudyResourceTopicKey[]): FreeStudyResource[] {
  const directResources = FREE_STUDY_RESOURCES.filter((resource) =>
    resource.topics.some((topic) => topicKeys.includes(topic)),
  )
  if (topicKeys.length === 0) return []

  return dedupeResources(directResources).slice(0, MAX_RESOURCES_PER_TOPIC)
}

function pickVideoResources(
  topicKeys: StudyResourceTopicKey[],
  excludedResources: FreeStudyResource[] = [],
): FreeStudyResource[] {
  const directResources = FREE_STUDY_VIDEO_RESOURCES.filter((resource) =>
    resource.topics.some((topic) => topicKeys.includes(topic)),
  )
  if (topicKeys.length === 0) return []

  return dedupeResources(directResources, excludedResources).slice(0, MAX_VIDEO_RESOURCES_PER_TOPIC)
}

function createDefaultSteps(title: string): string[] {
  return [
    `Comece revisando os fundamentos de ${title} com uma fonte principal.`,
    "Faça anotações curtas com exemplos próprios, sem copiar tudo da documentação.",
    "Resolva exercícios pequenos no mesmo dia para transformar leitura em prática.",
    "Feche a semana com um mini projeto ou entrega concreta relacionada ao tema.",
  ]
}

function createProjectSuggestion(title: string): string {
  return `Crie uma entrega pequena sobre ${title}, como um resumo prático, checklist, tela, script ou exercício aplicado ao seu projeto atual.`
}

function getBroadTopicDefinition(title: string): BroadTopicDefinition | null {
  const normalized = normalizeText(title)

  return BROAD_TOPIC_DEFINITIONS.find((definition) =>
    definition.keywords.some((keyword) => normalized.includes(normalizeText(keyword))),
  ) ?? null
}

function createBroadTopicOptions(definition: BroadTopicDefinition): StudyTopicFocusOption[] {
  return definition.focusOptions.map((focus) => {
    const resources = dedupeResources(focus.resources).slice(0, MAX_RESOURCES_PER_TOPIC)
    const rawVideoResources = focus.videoResources ?? getBroadFocusVideoResources(definition.id, focus.id)

    return {
      ...focus,
      resources,
      videoResources: dedupeResources(rawVideoResources, resources).slice(0, MAX_VIDEO_RESOURCES_PER_TOPIC),
    }
  })
}

export function applyStudyTopicFocus(topic: StudyTrailTopic, focusId: string): StudyTrailTopic {
  const focus = topic.focusOptions?.find((option) => option.id === focusId)
  if (!focus) return topic

  const resources = dedupeResources(focus.resources).slice(0, MAX_RESOURCES_PER_TOPIC)
  const videoResources = dedupeResources(focus.videoResources, resources).slice(0, MAX_VIDEO_RESOURCES_PER_TOPIC)

  return {
    ...topic,
    steps: focus.steps,
    resources,
    videoResources,
    selectedFocusId: focus.id,
    selectedFocusLabel: focus.label,
  }
}

function createTopicFromSource(source: StudyBlockTopicSource): StudyTrailTopic {
  const topicKeys = source.topicKeys
  const broadDefinition = getBroadTopicDefinition(source.title)
  const isBroad = broadDefinition !== null

  const resources = isBroad ? [] : pickResources(topicKeys)

  return {
    id: source.id,
    title: source.title,
    description: "",
    sourceBlocks: source.sourceBlocks,
    sourceDays: source.days,
    occurrenceCount: source.occurrenceCount,
    totalMinutes: source.totalMinutes,
    resources,
    videoResources: isBroad ? [] : pickVideoResources(topicKeys, resources),
    steps: isBroad ? broadDefinition.introSteps : createDefaultSteps(source.title),
    projectSuggestion: createProjectSuggestion(source.title),
    isBroad,
    focusOptions: broadDefinition ? createBroadTopicOptions(broadDefinition) : [],
    selectedFocusId: null,
    selectedFocusLabel: null,
  }
}

function collectStudyTopicSources(context: MentorContext): StudyBlockTopicSource[] {
  const monthTopics = context.monthRoutine?.topics ?? []

  if (monthTopics.length > 0) {
    return monthTopics
      .filter((topic) => topic.title.trim().length > 0)
      .map((topic) => {
        const title = topic.title.trim()
        return {
          id: topic.id || createTopicId(title),
          title,
          sourceBlocks: topic.sourceBlocks.length > 0 ? topic.sourceBlocks : [title],
          days: topic.days,
          occurrenceCount: topic.occurrenceCount,
          totalMinutes: topic.totalMinutes,
          topicKeys: inferTopicKeys(title),
        }
      })
  }

  const groupedBlocks = new Map<string, StudyBlockTopicSource>()

  for (const day of [context.todayRoutine, ...context.weekRoutine]) {
    for (const block of day.blocks) {
      const title = block.title.trim()
      if (!title || !isStudyTrailBlock(block)) continue

      const id = createTopicId(title)
      const current = groupedBlocks.get(id)

      if (current) {
        current.sourceBlocks = uniq([...current.sourceBlocks, title])
        current.days = uniq([...current.days, day.dateKey])
        current.occurrenceCount += 1
        current.totalMinutes += block.durationMinutes
        current.topicKeys = uniq([...current.topicKeys, ...inferTopicKeys(title)])
      } else {
        groupedBlocks.set(id, {
          id,
          title,
          sourceBlocks: [title],
          days: [day.dateKey],
          occurrenceCount: 1,
          totalMinutes: block.durationMinutes,
          topicKeys: inferTopicKeys(title),
        })
      }
    }
  }

  return Array.from(groupedBlocks.values())
}

export function createStudyTrailSignatureFromContext(context: MentorContext): string {
  return collectStudyTopicSources(context)
    .map((topic) => `${topic.id}:${topic.occurrenceCount}:${topic.totalMinutes}:${topic.days.join("|")}`)
    .sort()
    .join(";")
}

export function createStudyTrailTopicFromTitle(title: string): StudyTrailTopic {
  const trimmedTitle = title.trim() || "Tema de estudo"
  return createTopicFromSource({
    id: createTopicId(trimmedTitle),
    title: trimmedTitle,
    sourceBlocks: [trimmedTitle],
    days: [],
    occurrenceCount: 1,
    totalMinutes: 0,
    topicKeys: inferTopicKeys(trimmedTitle),
  })
}

export function findTrailTopicByTitle(trails: StudyTrail[], title: string): StudyTrailTopic | null {
  const id = createTopicId(title)

  for (const trail of trails) {
    const topic = trail.topics.find((item) => item.id === id || normalizeText(item.title) === normalizeText(title))
    if (topic) return topic
  }

  return null
}

export function createStudyTrailFromContext(context: MentorContext): StudyTrail {
  const topicSources = collectStudyTopicSources(context).slice(0, MAX_TRAIL_TOPICS)
  const topics = topicSources.map(createTopicFromSource)

  return {
    id: `trail-${Date.now()}`,
    title: `Trilha de estudos — ${context.activeRoutine.name}`,
    createdAt: new Date().toISOString(),
    routineName: context.activeRoutine.name,
    summary:
      topics.length > 0
        ? `Trilha criada a partir de ${topics.length} tema${topics.length === 1 ? "" : "s"} único${topics.length === 1 ? "" : "s"} do mês.`
        : "Crie blocos de estudo na rotina para gerar uma trilha personalizada.",
    topics,
    mentorNotes: "",
    providerMode: "mock",
    routineSignature: createStudyTrailSignatureFromContext(context),
  }
}

function formatResourceForPrompt(resource: FreeStudyResource): string {
  return `- ${resource.title} (${resource.type}, ${resource.language}, ${resource.level}) — ${resource.url}\n  ${resource.description}`
}

export function createStudyTrailPrompt(trail: StudyTrail): string {
  const topics = trail.topics
    .map((topic, index) => {
      const resources = topic.resources.map(formatResourceForPrompt).join("\n")
      const videoResources = (topic.videoResources ?? []).map(formatResourceForPrompt).join("\n")
      return [
        `${index + 1}. ${topic.selectedFocusLabel ? `${topic.title} — ${topic.selectedFocusLabel}` : topic.title}`,
        `Ocorrências no mês: ${topic.occurrenceCount ?? 1}`,
        `Tempo planejado no mês: ${topic.totalMinutes ?? 0} minutos`,
        `Blocos de origem: ${topic.sourceBlocks.join(", ")}`,
        "Recursos permitidos:",
        resources || "Nenhum recurso base cadastrado.",
        "Vídeos e canais permitidos:",
        videoResources || "Nenhum vídeo ou canal cadastrado.",
      ].join("\n")
    })
    .join("\n\n")

  return [
    "Monte uma trilha de estudos prática para os temas únicos encontrados na rotina mensal do usuário.",
    "Use APENAS os links listados abaixo. Não invente links, nomes de canais, vídeos ou plataformas.",
    "Separe recursos base de vídeos/canais quando fizer sentido.",
    "Organize por matéria/tema e explique como estudar cada tema com passos aplicáveis.",
    "A resposta deve ser em português do Brasil, clara, motivadora e útil para alguém estudando sozinho.",
    "Evite respostas gigantes; priorize ações práticas.",
    "A rotina diz quando estudar; a trilha diz em que ordem aprender.",
    "",
    `Resumo da trilha: ${trail.summary}`,
    "",
    "Temas e recursos disponíveis:",
    topics || "Nenhum tema encontrado.",
  ].join("\n")
}

function formatResourceList(resources: FreeStudyResource[]): string {
  return resources
    .slice(0, 4)
    .map((resource) => `- ${resource.title}: ${resource.url}`)
    .join("\n")
}

function formatMissingResourceMessage(topic: StudyTrailTopic): string {
  if (topic.isBroad && !topic.selectedFocusId) return "Escolha um foco ou refine o tema para receber recomendações mais precisas."
  return "Ainda não há recomendações confiáveis cadastradas para este tema."
}

export function createLocalStudyTrailReply(trail: StudyTrail): string {
  if (trail.topics.length === 0) {
    return "Crie blocos de estudo na rotina para que eu consiga montar uma trilha personalizada com recursos gratuitos."
  }

  const topicSections = trail.topics
    .map((topic, index) => {
      return [
        `${index + 1}. ${topic.selectedFocusLabel ? `${topic.title} — ${topic.selectedFocusLabel}` : topic.title}`,
        "",
        "**Como estudar:**",
        ...topic.steps.map((step) => `- ${step}`),
        "",
        "**Recursos gratuitos:**",
        topic.resources.length > 0 ? formatResourceList(topic.resources) : formatMissingResourceMessage(topic),
        "",
        "**Vídeos e canais:**",
        (topic.videoResources?.length ?? 0) > 0 ? formatResourceList(topic.videoResources ?? []) : formatMissingResourceMessage(topic),
      ].join("\n")
    })
    .join("\n\n")

  return [
    "Montei uma trilha inicial com base nos temas únicos do mês e em recursos gratuitos já cadastrados no RoutineOS.",
    "",
    topicSections,
  ].join("\n")
}
