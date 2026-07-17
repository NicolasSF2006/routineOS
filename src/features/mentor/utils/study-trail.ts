import {
  FREE_STUDY_RESOURCES,
  FREE_STUDY_VIDEO_RESOURCES,
} from "@/features/mentor/data/free-study-resources"
import type {
  FreeStudyResource,
  MentorContext,
  MentorContextBlock,
  MentorStudyTrailPlan,
  StudyResourceTopicKey,
  StudyTopicFocusOption,
  StudyTrail,
  StudyTrailTopic,
} from "@/features/mentor/types"

const MAX_RESOURCES_PER_TOPIC = 5
const MAX_VIDEO_RESOURCES_PER_TOPIC = 4
const MAX_TRAIL_TOPICS = 60

const STUDY_BLOCK_TYPES = ["study", "project", "other"] as const

import {
  BROAD_TOPIC_DEFINITIONS,
  DAVINCI_TOPIC_BLUEPRINTS,
  DOMAIN_CONTEXT_KEYWORDS,
  TOPIC_KEYWORDS,
  getBroadFocusVideoResources,
  getDomainTopicResourceSet,
} from "@/features/mentor/utils/study-trail-catalog"
import type {
  BroadTopicFocusOption,
  BroadTopicDefinition,
  DomainTopicBlueprint,
  StudyBlockTopicSource,
  StudyTrailDomainContext,
} from "@/features/mentor/utils/study-trail-catalog"

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

function areResourcesEquivalent(
  resource: FreeStudyResource,
  comparedResource: FreeStudyResource,
): boolean {
  const resourceUrl = normalizeResourceUrl(resource.url)
  const comparedUrl = normalizeResourceUrl(comparedResource.url)
  if (resourceUrl === comparedUrl) return true

  const resourceTitle = normalizeText(resource.title)
  const comparedTitle = normalizeText(comparedResource.title)
  if (resourceTitle.length > 0 && resourceTitle === comparedTitle) return true

  const resourceProvider = normalizeText(resource.provider)
  const comparedProvider = normalizeText(comparedResource.provider)
  if (resourceProvider.length === 0 || comparedProvider.length === 0)
    return false

  return (
    resourceProvider === comparedProvider &&
    (resourceTitle.includes(comparedTitle) ||
      comparedTitle.includes(resourceTitle))
  )
}

function dedupeResources(
  resources: FreeStudyResource[],
  excludedResources: FreeStudyResource[] = [],
): FreeStudyResource[] {
  return resources.filter((resource, resourceIndex) => {
    const duplicatedBefore = resources
      .slice(0, resourceIndex)
      .some((comparedResource) =>
        areResourcesEquivalent(resource, comparedResource),
      )

    if (duplicatedBefore) return false

    return !excludedResources.some((excludedResource) =>
      areResourcesEquivalent(resource, excludedResource),
    )
  })
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

export function createTopicId(title: string): string {
  return (
    normalizeText(title)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tema"
  )
}

export function isStudyTrailBlock(
  block: Pick<MentorContextBlock, "type">,
): boolean {
  return STUDY_BLOCK_TYPES.includes(
    block.type as (typeof STUDY_BLOCK_TYPES)[number],
  )
}

function inferTopicKeys(title: string): StudyResourceTopicKey[] {
  const normalized = normalizeText(title)
  const matches = Object.entries(TOPIC_KEYWORDS)
    .filter(([, keywords]) =>
      keywords.some((keyword) => normalized.includes(normalizeText(keyword))),
    )
    .map(([topic]) => topic as StudyResourceTopicKey)

  if (matches.includes("react") && !matches.includes("javascript"))
    matches.push("javascript")
  if (matches.includes("node") && !matches.includes("backend"))
    matches.push("backend")
  if (matches.includes("sql") && !matches.includes("database"))
    matches.push("database")
  if (
    (matches.includes("html") ||
      matches.includes("css") ||
      matches.includes("javascript")) &&
    !matches.includes("frontend")
  ) {
    matches.push("frontend")
  }

  return uniq(matches)
}

function pickResources(
  topicKeys: StudyResourceTopicKey[],
): FreeStudyResource[] {
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

  return dedupeResources(directResources, excludedResources).slice(
    0,
    MAX_VIDEO_RESOURCES_PER_TOPIC,
  )
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

  return (
    BROAD_TOPIC_DEFINITIONS.find((definition) =>
      definition.keywords.some((keyword) =>
        normalized.includes(normalizeText(keyword)),
      ),
    ) ?? null
  )
}

function getDomainContext(value: string): StudyTrailDomainContext | null {
  const normalized = normalizeText(value)
  const definition = BROAD_TOPIC_DEFINITIONS.find((candidate) => {
    const keywords = DOMAIN_CONTEXT_KEYWORDS[candidate.id] ?? candidate.keywords
    return keywords.some((keyword) =>
      normalized.includes(normalizeText(keyword)),
    )
  })

  if (!definition) return null

  const focusSignals: Record<string, string[]> = {
    "davinci-resolve": [
      "davinci resolve",
      "davinci",
      "cut page",
      "edit page",
      "fairlight",
      "color page",
    ],
    premiere: ["adobe premiere", "premiere pro", "premiere"],
    capcut: ["capcut"],
    "color-grading": ["color grading", "correcao de cor", "correção de cor"],
    "short-form": [
      "reels",
      "tiktok",
      "short form",
      "video curto",
      "vídeo curto",
    ],
    youtube: ["youtube"],
    "ui-design": ["figma", "ui design", "interface"],
    branding: ["branding", "identidade visual"],
  }
  const focusPriority = [
    "davinci-resolve",
    "premiere",
    "capcut",
    "color-grading",
    "short-form",
    "youtube",
    "ui-design",
    "branding",
  ]

  const focus =
    focusPriority
      .map((focusId) =>
        definition.focusOptions.find((option) => option.id === focusId),
      )
      .find((option) => {
        if (!option) return false
        const optionSignals = focusSignals[option.id] ?? [
          option.id,
          option.label,
        ]
        return optionSignals.some((signal) =>
          normalized.includes(normalizeText(signal)),
        )
      }) ??
    definition.focusOptions.find((option) => {
      return [option.id, option.label].some((signal) =>
        normalized.includes(normalizeText(signal)),
      )
    }) ??
    null

  return { definition, focus }
}

function getDomainTopicBlueprint(
  domainContext: StudyTrailDomainContext | null,
  title: string,
): DomainTopicBlueprint | null {
  if (
    domainContext?.definition.id !== "video-editing" ||
    domainContext.focus?.id !== "davinci-resolve"
  ) {
    return null
  }

  const normalizedTitle = normalizeText(title)
  return (
    DAVINCI_TOPIC_BLUEPRINTS.find((blueprint) =>
      blueprint.keywords.some((keyword) =>
        normalizedTitle.includes(normalizeText(keyword)),
      ),
    ) ?? null
  )
}

function createDomainDefaultSteps(
  title: string,
  focus: BroadTopicFocusOption,
): string[] {
  return [
    `Entenda onde ${title} aparece no fluxo de ${focus.label} e qual problema esse tema resolve.`,
    ...focus.steps.slice(0, 2),
    `Finalize com uma prática curta e registre o que ainda ficou difícil em ${title}.`,
  ]
}

function createBroadTopicOptions(
  definition: BroadTopicDefinition,
): StudyTopicFocusOption[] {
  return definition.focusOptions.map((focus) => {
    const resources = dedupeResources(focus.resources).slice(
      0,
      MAX_RESOURCES_PER_TOPIC,
    )
    const rawVideoResources =
      focus.videoResources ??
      getBroadFocusVideoResources(definition.id, focus.id)

    return {
      ...focus,
      resources,
      videoResources: dedupeResources(rawVideoResources, resources).slice(
        0,
        MAX_VIDEO_RESOURCES_PER_TOPIC,
      ),
    }
  })
}

export function applyStudyTopicFocus(
  topic: StudyTrailTopic,
  focusId: string,
): StudyTrailTopic {
  const focus = topic.focusOptions?.find((option) => option.id === focusId)
  if (!focus) return topic

  const resources = dedupeResources(focus.resources).slice(
    0,
    MAX_RESOURCES_PER_TOPIC,
  )
  const videoResources = dedupeResources(focus.videoResources, resources).slice(
    0,
    MAX_VIDEO_RESOURCES_PER_TOPIC,
  )

  return {
    ...topic,
    steps: focus.steps,
    resources,
    videoResources,
    selectedFocusId: focus.id,
    selectedFocusLabel: focus.label,
  }
}

function createTopicFromSource(
  source: StudyBlockTopicSource,
  domainContext: StudyTrailDomainContext | null = null,
): StudyTrailTopic {
  const topicKeys = source.topicKeys
  const broadDefinition = getBroadTopicDefinition(source.title)
  const isBroad = broadDefinition !== null
  const domainBlueprint = getDomainTopicBlueprint(domainContext, source.title)
  const domainFocus = !isBroad ? (domainContext?.focus ?? null) : null
  const domainTopicResourceSet = getDomainTopicResourceSet(domainBlueprint)

  const domainResources = domainTopicResourceSet
    ? dedupeResources(domainTopicResourceSet.resources).slice(
        0,
        MAX_RESOURCES_PER_TOPIC,
      )
    : domainFocus
      ? dedupeResources(domainFocus.resources).slice(0, MAX_RESOURCES_PER_TOPIC)
      : []
  const domainVideoResources = domainTopicResourceSet
    ? dedupeResources(
        domainTopicResourceSet.videoResources,
        domainResources,
      ).slice(0, MAX_VIDEO_RESOURCES_PER_TOPIC)
    : domainFocus
      ? dedupeResources(
          domainFocus.videoResources ??
            getBroadFocusVideoResources(
              domainContext?.definition.id ?? "",
              domainFocus.id,
            ),
          domainResources,
        ).slice(0, MAX_VIDEO_RESOURCES_PER_TOPIC)
      : []
  const resources = isBroad
    ? []
    : domainFocus
      ? domainResources
      : pickResources(topicKeys)
  const videoResources = isBroad
    ? []
    : domainFocus
      ? domainVideoResources
      : pickVideoResources(topicKeys, resources)

  return {
    id: source.id,
    title: source.title,
    description: domainBlueprint?.description ?? "",
    sourceBlocks: source.sourceBlocks,
    sourceDays: source.days,
    occurrenceCount: source.occurrenceCount,
    totalMinutes: source.totalMinutes,
    resources,
    videoResources,
    userCourses: [],
    steps: isBroad
      ? broadDefinition.introSteps
      : (domainBlueprint?.steps ??
        (domainFocus
          ? createDomainDefaultSteps(source.title, domainFocus)
          : createDefaultSteps(source.title))),
    projectSuggestion:
      domainBlueprint?.projectSuggestion ??
      createProjectSuggestion(source.title),
    isBroad,
    focusOptions: broadDefinition
      ? createBroadTopicOptions(broadDefinition)
      : [],
    selectedFocusId: null,
    selectedFocusLabel: null,
    hiddenResourceIds: [],
    favoriteResourceIds: [],
    studiedResourceIds: [],
    masteryStatus: null,
    masteryUpdatedAt: null,
  }
}

function collectStudyTopicSources(
  context: MentorContext,
): StudyBlockTopicSource[] {
  const monthTopics = context.monthRoutine?.topics ?? []

  if (monthTopics.length > 0) {
    return monthTopics
      .filter((topic) => topic.title.trim().length > 0)
      .map((topic) => {
        const title = topic.title.trim()
        return {
          id: topic.id || createTopicId(title),
          title,
          sourceBlocks:
            topic.sourceBlocks.length > 0 ? topic.sourceBlocks : [title],
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
        current.topicKeys = uniq([
          ...current.topicKeys,
          ...inferTopicKeys(title),
        ])
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

export function createStudyTrailSignatureFromContext(
  context: MentorContext,
): string {
  return collectStudyTopicSources(context)
    .map(
      (topic) =>
        `${topic.id}:${topic.occurrenceCount}:${topic.totalMinutes}:${topic.days.join("|")}`,
    )
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

export function findTrailTopicByTitle(
  trails: StudyTrail[],
  title: string,
): StudyTrailTopic | null {
  const id = createTopicId(title)

  for (const trail of trails) {
    const topic = trail.topics.find(
      (item) =>
        item.id === id || normalizeText(item.title) === normalizeText(title),
    )
    if (topic) return topic
  }

  return null
}

export function createStudyTrailFromContext(
  context: MentorContext,
): StudyTrail {
  const topicSources = collectStudyTopicSources(context).slice(
    0,
    MAX_TRAIL_TOPICS,
  )
  const domainContext = getDomainContext(
    [
      context.activeRoutine.name,
      ...topicSources.map((topic) => topic.title),
    ].join(" "),
  )
  const topics = topicSources.map((topic) =>
    createTopicFromSource(topic, domainContext),
  )

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

function filterResourcesByIds(
  resources: FreeStudyResource[],
  requestedIds: string[],
): FreeStudyResource[] {
  if (requestedIds.length === 0) return resources

  const requested = new Set(requestedIds)
  const filtered = resources.filter((resource) => requested.has(resource.id))
  return filtered.length > 0 ? filtered : resources
}

export function applyMentorStudyTrailPlan(
  trail: StudyTrail,
  plan: MentorStudyTrailPlan,
): StudyTrail {
  const planByTopicId = new Map(
    plan.topics.map((topic) => [topic.topicId, topic]),
  )

  return {
    ...trail,
    title: plan.title?.trim() || trail.title,
    summary: plan.summary.trim() || trail.summary,
    mentorNotes: plan.mentorNotes?.trim() || trail.mentorNotes,
    topics: trail.topics.map((topic) => {
      const topicPlan =
        planByTopicId.get(topic.id) ??
        planByTopicId.get(createTopicId(topic.title))
      if (!topicPlan) return topic

      return {
        ...topic,
        description: topicPlan.description,
        steps: topicPlan.steps,
        projectSuggestion: topicPlan.projectSuggestion,
        resources: filterResourcesByIds(topic.resources, topicPlan.resourceIds),
        videoResources: filterResourcesByIds(
          topic.videoResources ?? [],
          topicPlan.videoResourceIds,
        ),
      }
    }),
  }
}

export function mergeStudyTrailUserState(
  generatedTrail: StudyTrail,
  previousTrail: StudyTrail | null,
): StudyTrail {
  if (!previousTrail) return generatedTrail

  const previousTopics = new Map(
    previousTrail.topics.map((topic) => [topic.id, topic]),
  )

  return {
    ...generatedTrail,
    topics: generatedTrail.topics.map((topic) => {
      const previous = previousTopics.get(topic.id)
      if (!previous) return topic

      return {
        ...topic,
        userCourses: previous.userCourses ?? [],
        hiddenResourceIds: previous.hiddenResourceIds ?? [],
        favoriteResourceIds: previous.favoriteResourceIds ?? [],
        studiedResourceIds: previous.studiedResourceIds ?? [],
        masteryStatus: previous.masteryStatus ?? null,
        masteryUpdatedAt: previous.masteryUpdatedAt ?? null,
      }
    }),
  }
}

export function createStudyTrailPrompt(trail: StudyTrail): string {
  const topics = trail.topics
    .map((topic, index) => {
      const resources = topic.resources
        .map(
          (resource) =>
            `${resource.id} | ${resource.title} | ${resource.provider}`,
        )
        .join("; ")
      const videoResources = (topic.videoResources ?? [])
        .map(
          (resource) =>
            `${resource.id} | ${resource.title} | ${resource.provider}`,
        )
        .join("; ")

      return [
        `${index + 1}. topicId=${topic.id}`,
        `Título: ${topic.title}`,
        `Ocorrências no mês: ${topic.occurrenceCount ?? 1}`,
        `Tempo planejado no mês: ${topic.totalMinutes ?? 0} minutos`,
        `Descrição local disponível: ${topic.description || "Nenhuma"}`,
        `Recursos permitidos: ${resources || "Nenhum"}`,
        `Vídeos/canais permitidos: ${videoResources || "Nenhum"}`,
      ].join("\n")
    })
    .join("\n\n")

  return [
    "GERAR_TRILHA_ESTRUTURADA",
    "Crie uma trilha pedagógica coerente para os temas abaixo, respeitando a ordem apresentada.",
    "Responda obrigatoriamente com action.type propose-study-trail.",
    "Para cada tema, use exatamente o topicId fornecido.",
    "Escreva uma descrição específica do objetivo, de 3 a 5 passos realmente aplicáveis e uma prática concreta.",
    "Os passos devem evoluir de fundamentos para aplicação e não podem repetir o mesmo texto genérico entre os temas.",
    "Use somente resourceIds e videoResourceIds listados como permitidos para o próprio tema. Nunca invente links ou IDs.",
    "Escolha recomendações diretamente ligadas ao assunto de cada tema. Não reutilize recursos gerais de criação para temas técnicos quando houver material específico permitido.",
    "Recursos sobre estratégia ou publicação no YouTube devem ficar restritos a temas de projeto final, entrega ou publicação.",
    "Quando não houver recurso permitido, devolva arrays vazios.",
    "Não altere ocorrências, minutos, títulos dos temas ou a rotina.",
    "Mantenha o JSON compacto para não truncar a resposta.",
    "A rotina define quando estudar; esta trilha deve definir o que aprender e como praticar.",
    "",
    `Nome da rotina: ${trail.routineName}`,
    `Resumo base: ${trail.summary}`,
    "",
    "Temas:",
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
  if (topic.isBroad && !topic.selectedFocusId)
    return "Escolha um foco ou refine o tema para receber recomendações mais precisas."
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
        topic.resources.length > 0
          ? formatResourceList(topic.resources)
          : formatMissingResourceMessage(topic),
        "",
        "**Vídeos e canais:**",
        (topic.videoResources?.length ?? 0) > 0
          ? formatResourceList(topic.videoResources ?? [])
          : formatMissingResourceMessage(topic),
      ].join("\n")
    })
    .join("\n\n")

  return [
    "Montei uma trilha inicial com base nos temas únicos do mês e em recursos gratuitos já cadastrados no RoutineOS.",
    "",
    topicSections,
  ].join("\n")
}
