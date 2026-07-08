"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, ExternalLink, Loader2, Plus, Search, Trash2 } from "lucide-react"
import { PageHeading } from "@/components/shared/page-heading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { STORAGE_EVENTS } from "@/constants/storage"
import { buildMentorContext } from "@/features/mentor/utils/mentor-context"
import {
  applyStudyTopicFocus,
  createStudyTrailSignatureFromContext,
} from "@/features/mentor/utils/study-trail"
import { cn } from "@/lib/utils"
import { loadMentorTrails, saveMentorTrails } from "@/lib/storage"
import type { StudyTrail, StudyTrailApiResponse, StudyTrailTopic } from "@/features/mentor/types"

function formatTopicMeta(topic: StudyTrailTopic): string {
  const parts: string[] = []

  if (topic.occurrenceCount && topic.occurrenceCount > 0) {
    parts.push(`${topic.occurrenceCount} ocorrência${topic.occurrenceCount === 1 ? "" : "s"}`)
  }

  if (topic.totalMinutes && topic.totalMinutes > 0) {
    const hours = Math.round((topic.totalMinutes / 60) * 10) / 10
    parts.push(`${hours}h planejadas`)
  }

  return parts.join(" • ")
}

function TrailsEmptyState({ onGenerate, isGenerating }: { onGenerate: () => void; isGenerating: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 px-4 py-10 text-center sm:px-8">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen className="size-7" aria-hidden="true" />
        </span>
        <div className="max-w-2xl space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Nenhuma trilha salva ainda</h3>
          <p className="wrap-break-word text-sm leading-6 text-muted-foreground">
            Gere uma trilha com os temas únicos encontrados no mês inteiro da sua rotina.
          </p>
        </div>
        <Button type="button" onClick={onGenerate} disabled={isGenerating} className="min-h-11">
          {isGenerating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          Gerar trilha da rotina completa
        </Button>
      </CardContent>
    </Card>
  )
}

function TopicList({
  topics,
  selectedTopicId,
  searchTerm,
  onSearchChange,
  onSelect,
}: {
  topics: StudyTrailTopic[]
  selectedTopicId: string | null
  searchTerm: string
  onSearchChange: (value: string) => void
  onSelect: (topicId: string) => void
}) {
  return (
    <div className="space-y-3">
      <label className="sr-only" htmlFor="trail-topic-search">
        Pesquisar tema da trilha
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id="trail-topic-search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Pesquisar tema..."
          className="h-11 rounded-xl pl-9"
        />
      </div>

      <div className="grid gap-2">
        {topics.length > 0 ? (
          topics.map((topic, index) => {
            const isSelected = topic.id === selectedTopicId

            return (
              <button
                key={`${topic.id}-${index}`}
                type="button"
                onClick={() => onSelect(topic.id)}
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected ? "border-primary/70 bg-primary/10" : "border-border/70 bg-card hover:bg-muted/40",
                )}
                aria-pressed={isSelected}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="wrap-break-word min-w-0 text-base font-semibold text-foreground">{topic.title}</span>
              </button>
            )
          })
        ) : (
          <p className="wrap-break-word rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            Nenhum tema encontrado com esse nome.
          </p>
        )}
      </div>
    </div>
  )
}

function ResourceLinkList({
  resources,
  emptyMessage,
}: {
  resources: StudyTrailTopic["resources"]
  emptyMessage: string
}) {
  if (resources.length === 0) {
    return (
      <p className="wrap-break-word rounded-xl border border-dashed border-border/70 px-3 py-3 text-sm leading-6 text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      {resources.map((resource, resourceIndex) => (
        <a
          key={`${resource.id}-${resourceIndex}`}
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          className="group rounded-xl border border-border/70 bg-background/75 px-3 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-start justify-between gap-2">
            <span className="min-w-0">
              <span className="wrap-break-word block text-sm font-medium text-foreground group-hover:text-primary">
                {resource.title}
              </span>
              <span className="wrap-break-word block text-sm leading-6 text-muted-foreground">
                {resource.provider} • {resource.type} • {resource.language}
              </span>
            </span>
            <ExternalLink className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </span>
        </a>
      ))}
    </div>
  )
}

function TopicDetails({
  topic,
  topicIndex,
  onSelectFocus,
}: {
  topic: StudyTrailTopic | null
  topicIndex: number
  onSelectFocus: (topicId: string, focusId: string) => void
}) {
  if (!topic) {
    return (
      <Card className="h-full">
        <CardContent className="flex min-h-64 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Selecione um tema para ver como estudar e quais recursos gratuitos usar.
        </CardContent>
      </Card>
    )
  }

  const topicTitle = topic.selectedFocusLabel ? `${topic.title} — ${topic.selectedFocusLabel}` : topic.title
  const needsFocus = topic.isBroad === true && !topic.selectedFocusId && (topic.focusOptions?.length ?? 0) > 0
  const resources = topic.resources ?? []
  const videoResources = topic.videoResources ?? []
  const emptyResourceMessage = needsFocus
    ? "Escolha um foco para receber recursos mais precisos."
    : "Ainda não há recursos confiáveis cadastrados para este tema."
  const emptyVideoMessage = needsFocus
    ? "Escolha um foco para receber vídeos e canais mais precisos."
    : "Ainda não há vídeos ou canais confiáveis cadastrados para este tema."

  return (
    <Card className="h-full">
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            {topicIndex + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="wrap-break-word text-xl font-semibold text-foreground">{topicTitle}</h3>
            {formatTopicMeta(topic) ? (
              <p className="wrap-break-word text-sm text-muted-foreground">{formatTopicMeta(topic)}</p>
            ) : null}
          </div>
        </div>

        {needsFocus ? (
          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <p className="wrap-break-word text-sm font-medium text-foreground">
              Este tema é amplo. Escolha um foco para melhorar a trilha:
            </p>
            <div className="flex flex-wrap gap-2">
              {topic.focusOptions?.map((focus) => (
                <Button
                  key={`${topic.id}-focus-${focus.id}`}
                  type="button"
                  variant="outline"
                  className="min-h-10 rounded-full"
                  onClick={() => onSelectFocus(topic.id, focus.id)}
                >
                  {focus.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            <h4 className="text-base font-semibold text-foreground">Como estudar</h4>
            <ul className="space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
              {topic.steps.map((step, stepIndex) => (
                <li key={`${topic.id}-step-${stepIndex}`} className="wrap-break-word list-disc">
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <h4 className="text-base font-semibold text-foreground">Recursos gratuitos</h4>
              <ResourceLinkList resources={resources} emptyMessage={emptyResourceMessage} />
            </div>

            <div className="space-y-2">
              <h4 className="text-base font-semibold text-foreground">Vídeos e canais</h4>
              <ResourceLinkList resources={videoResources} emptyMessage={emptyVideoMessage} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TrailsView() {
  const [trails, setTrails] = useState<StudyTrail[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentRoutineSignature, setCurrentRoutineSignature] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const refreshTrails = () => {
    const nextTrails = loadMentorTrails()
    const context = buildMentorContext({ currentView: "trilhas" })

    setTrails(nextTrails)
    setCurrentRoutineSignature(createStudyTrailSignatureFromContext(context))
    setSelectedTopicId((current) => {
      if (current && nextTrails[0]?.topics.some((topic) => topic.id === current)) return current
      return nextTrails[0]?.topics[0]?.id ?? null
    })
  }

  useEffect(() => {
    refreshTrails()
    window.addEventListener("storage", refreshTrails)
    window.addEventListener(STORAGE_EVENTS.mentorTrailsChanged, refreshTrails)
    window.addEventListener(STORAGE_EVENTS.appDataChanged, refreshTrails)

    return () => {
      window.removeEventListener("storage", refreshTrails)
      window.removeEventListener(STORAGE_EVENTS.mentorTrailsChanged, refreshTrails)
      window.removeEventListener(STORAGE_EVENTS.appDataChanged, refreshTrails)
    }
  }, [])

  const activeTrail = trails[0] ?? null
  const filteredTopics = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!activeTrail) return []
    if (!normalizedSearch) return activeTrail.topics

    return activeTrail.topics.filter((topic) => topic.title.toLowerCase().includes(normalizedSearch))
  }, [activeTrail, searchTerm])

  const selectedTopic = useMemo(() => {
    if (!activeTrail) return null
    const fallback = filteredTopics[0] ?? activeTrail.topics[0] ?? null
    return activeTrail.topics.find((topic) => topic.id === selectedTopicId) ?? fallback
  }, [activeTrail, filteredTopics, selectedTopicId])

  const selectedTopicIndex = useMemo(() => {
    if (!activeTrail || !selectedTopic) return 0
    return Math.max(0, activeTrail.topics.findIndex((topic) => topic.id === selectedTopic.id))
  }, [activeTrail, selectedTopic])

  const hasRoutineChanged = Boolean(
    activeTrail?.routineSignature &&
      currentRoutineSignature &&
      activeTrail.routineSignature !== currentRoutineSignature,
  )

  useEffect(() => {
    if (filteredTopics.length === 0) return
    if (!selectedTopicId || !filteredTopics.some((topic) => topic.id === selectedTopicId)) {
      setSelectedTopicId(filteredTopics[0].id)
    }
  }, [filteredTopics, selectedTopicId])

  const handleGenerateTrail = async () => {
    if (isGenerating) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/mentor/trail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: [],
          context: buildMentorContext({ currentView: "trilhas" }),
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | (Partial<StudyTrailApiResponse> & { error?: string })
        | null

      if (!response.ok || !payload?.trail) {
        throw new Error(payload?.error ?? "Não foi possível gerar a trilha agora.")
      }

      saveMentorTrails([payload.trail])
      setTrails([payload.trail])
      setSelectedTopicId(payload.trail.topics[0]?.id ?? null)
      setSearchTerm("")
      setCurrentRoutineSignature(payload.trail.routineSignature ?? "")
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível gerar a trilha agora.",
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteTrail = () => {
    if (!activeTrail) return

    const confirmed = window.confirm(
      `Excluir a trilha "${activeTrail.title}"? Essa ação não pode ser desfeita sem backup.`,
    )

    if (!confirmed) return

    saveMentorTrails([])
    setTrails([])
    setSelectedTopicId(null)
    setSearchTerm("")
  }

  const handleSelectTopicFocus = (topicId: string, focusId: string) => {
    if (!activeTrail) return

    const updatedTrail = {
      ...activeTrail,
      topics: activeTrail.topics.map((topic) =>
        topic.id === topicId ? applyStudyTopicFocus(topic, focusId) : topic,
      ),
    }

    saveMentorTrails([updatedTrail])
    setTrails([updatedTrail])
    setSelectedTopicId(topicId)
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
      <PageHeading title="Trilhas de estudo" align="center" />

      {error ? (
        <div className="wrap-break-word rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {trails.length === 0 ? (
        <TrailsEmptyState onGenerate={handleGenerateTrail} isGenerating={isGenerating} />
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(19rem,23rem)_1fr]">
          <section className="min-w-0 space-y-3" aria-label="Temas da trilha">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
              <h3 className="text-xl font-semibold text-foreground">Temas da trilha</h3>
              <div className="flex gap-2">
                {hasRoutineChanged ? (
                  <Button type="button" onClick={handleGenerateTrail} disabled={isGenerating} className="min-h-10 flex-1">
                    {isGenerating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                    Atualizar trilha
                  </Button>
                ) : (
                  <span className="flex min-h-10 flex-1 items-center rounded-xl border border-border/70 px-3 text-sm text-muted-foreground">
                    Não há mudanças na rotina
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  onClick={handleDeleteTrail}
                  aria-label="Excluir trilha atual"
                  title="Excluir trilha"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <TopicList
              topics={filteredTopics}
              selectedTopicId={selectedTopic?.id ?? null}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSelect={setSelectedTopicId}
            />
          </section>

          <section className="min-w-0" aria-label="Detalhes do tema">
            <TopicDetails topic={selectedTopic} topicIndex={selectedTopicIndex} onSelectFocus={handleSelectTopicFocus} />
          </section>
        </div>
      )}
    </div>
  )
}
