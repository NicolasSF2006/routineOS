"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { BookOpen, Check, Loader2, Pencil, Plus, Search, Star, Trash2 } from "lucide-react"
import { PageHeading } from "@/components/shared/page-heading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { STORAGE_EVENTS } from "@/constants/storage"
import { buildMentorContext } from "@/features/mentor/utils/mentor-context"
import {
  applyStudyTopicFocus,
  createStudyTrailSignatureFromContext,
} from "@/features/mentor/utils/study-trail"
import { cn } from "@/lib/utils"
import { loadMentorTrails, saveMentorTrails } from "@/lib/storage"
import type {
  StudyTrail,
  StudyTrailApiResponse,
  StudyTrailTopic,
  StudyTrailUserCourse,
} from "@/features/mentor/types"

function toggleResourceId(resourceIds: string[] | undefined, resourceId: string): string[] {
  const currentIds = new Set(resourceIds ?? [])

  if (currentIds.has(resourceId)) {
    currentIds.delete(resourceId)
  } else {
    currentIds.add(resourceId)
  }

  return Array.from(currentIds)
}

function removeResourceId(resourceIds: string[] | undefined, resourceId: string): string[] {
  return (resourceIds ?? []).filter((id) => id !== resourceId)
}

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

function createCourseId(): string {
  return `user-course-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeCourseUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const COURSE_PLATFORM_ALIASES: Array<{ hostname: string; label: string }> = [
  { hostname: "alura.com.br", label: "Alura" },
  { hostname: "youtube.com", label: "YouTube" },
  { hostname: "youtu.be", label: "YouTube" },
  { hostname: "udemy.com", label: "Udemy" },
  { hostname: "coursera.org", label: "Coursera" },
  { hostname: "edx.org", label: "edX" },
  { hostname: "rocketseat.com.br", label: "Rocketseat" },
  { hostname: "dio.me", label: "DIO" },
  { hostname: "freecodecamp.org", label: "freeCodeCamp" },
  { hostname: "cursoemvideo.com", label: "Curso em Vídeo" },
  { hostname: "web.dev", label: "web.dev" },
  { hostname: "figma.com", label: "Figma" },
]

function getFriendlyPlatformLabel(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]

  const alias = COURSE_PLATFORM_ALIASES.find(
    (item) => normalized === item.hostname || normalized.endsWith(`.${item.hostname}`),
  )

  return alias?.label ?? null
}

function getUrlFallbackLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")
    return getFriendlyPlatformLabel(hostname) ?? hostname
  } catch {
    return getFriendlyPlatformLabel(url) ?? url
  }
}

function getCoursePlatformLabel(course: StudyTrailUserCourse): string {
  const platform = course.platform?.trim()
  return getFriendlyPlatformLabel(platform ?? "") ?? (platform || getUrlFallbackLabel(course.url))
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
  topic,
  onToggleFavorite,
  onToggleStudied,
  onDeleteResource,
}: {
  resources: StudyTrailTopic["resources"]
  emptyMessage: string
  topic: StudyTrailTopic
  onToggleFavorite: (topicId: string, resourceId: string) => void
  onToggleStudied: (topicId: string, resourceId: string) => void
  onDeleteResource: (topicId: string, resourceId: string, resourceTitle: string, topicTitle: string) => void
}) {
  const hiddenIds = new Set(topic.hiddenResourceIds ?? [])
  const favoriteIds = new Set(topic.favoriteResourceIds ?? [])
  const studiedIds = new Set(topic.studiedResourceIds ?? [])
  const visibleResources = resources.filter((resource) => !hiddenIds.has(resource.id))

  if (visibleResources.length === 0) {
    return (
      <p className="wrap-break-word rounded-xl border border-dashed border-border/70 px-3 py-3 text-sm leading-6 text-muted-foreground">
        {resources.length > 0 ? "Todos os recursos desta seção foram ocultados." : emptyMessage}
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      {visibleResources.map((resource, resourceIndex) => {
        const isFavorite = favoriteIds.has(resource.id)
        const isStudied = studiedIds.has(resource.id)

        return (
          <div
            key={`${resource.id}-${resourceIndex}`}
            className={cn(
              "group rounded-xl border border-border/70 bg-background/75 px-3 py-2 transition-colors hover:bg-muted",
              isStudied ? "opacity-80" : "",
            )}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="wrap-break-word block text-sm font-medium text-foreground group-hover:text-primary">
                  {resource.title}
                </span>
                <span className="wrap-break-word block text-sm leading-6 text-muted-foreground">
                  {resource.provider} • {resource.type} • {resource.language}
                </span>
              </a>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(isFavorite ? "text-primary" : "text-muted-foreground")}
                  onClick={() => onToggleFavorite(topic.id, resource.id)}
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? "Remover dos favoritos" : "Favoritar recurso"}
                  title={isFavorite ? "Remover dos favoritos" : "Favoritar recurso"}
                >
                  <Star className={cn("size-4", isFavorite ? "fill-current" : "")} aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(isStudied ? "text-primary" : "text-muted-foreground")}
                  onClick={() => onToggleStudied(topic.id, resource.id)}
                  aria-pressed={isStudied}
                  aria-label={isStudied ? "Marcar como não estudado" : "Marcar como estudado"}
                  title={isStudied ? "Marcar como não estudado" : "Marcar como estudado"}
                >
                  <Check className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onDeleteResource(topic.id, resource.id, resource.title, topic.title)}
                  aria-label="Excluir recurso da trilha"
                  title="Excluir recurso da trilha"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CourseDialog({
  topic,
  course,
  onSaveCourse,
}: {
  topic: StudyTrailTopic
  course?: StudyTrailUserCourse
  onSaveCourse: (topicId: string, course: StudyTrailUserCourse) => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = Boolean(course)

  const resetForm = () => {
    setTitle("")
    setUrl("")
    setError(null)
    setIsSaving(false)
  }

  const openDialog = () => {
    setTitle(course?.title ?? "")
    setUrl(course?.url ?? "")
    setError(null)
    setIsSaving(false)
    setOpen(true)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  const resolvePlatform = async (normalizedUrl: string): Promise<string> => {
    try {
      const response = await fetch("/api/resource-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      })
      const payload = (await response.json().catch(() => null)) as { platform?: string } | null

      if (!response.ok) {
        return getUrlFallbackLabel(normalizedUrl)
      }

      return typeof payload?.platform === "string" && payload.platform.trim().length > 0
        ? payload.platform.trim()
        : getUrlFallbackLabel(normalizedUrl)
    } catch {
      return getUrlFallbackLabel(normalizedUrl)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return

    const trimmedTitle = title.trim()
    const normalizedUrl = normalizeCourseUrl(url)

    if (!trimmedTitle) {
      setError("Informe o nome do curso.")
      return
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(normalizedUrl)
    } catch {
      setError("Informe uma URL válida.")
      return
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      setError("Use uma URL com http ou https.")
      return
    }

    setIsSaving(true)
    setError(null)

    const now = new Date().toISOString()
    const shouldResolvePlatform = !course || course.url !== normalizedUrl || !course.platform
    const platform = shouldResolvePlatform ? await resolvePlatform(normalizedUrl) : course.platform

    onSaveCourse(topic.id, {
      id: course?.id ?? createCourseId(),
      title: trimmedTitle,
      url: normalizedUrl,
      platform,
      createdAt: course?.createdAt ?? now,
      updatedAt: isEditing ? now : undefined,
      isFavorite: course?.isFavorite === true,
      isCompleted: course?.isCompleted === true,
      completedAt: course?.completedAt ?? null,
    })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isEditing ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={openDialog}
          aria-label="Editar curso"
          title="Editar curso"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
      ) : (
        <Button type="button" variant="outline" className="min-h-10 w-full" onClick={openDialog}>
          <Plus className="size-4" aria-hidden="true" />
          Adicionar curso
        </Button>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle className="wrap-break-word text-xl">
            {isEditing ? `Editar curso em ${topic.title}` : `Adicionar curso em ${topic.title}`}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`course-title-${topic.id}-${course?.id ?? "new"}`}>Nome do curso</Label>
            <Input
              id={`course-title-${topic.id}-${course?.id ?? "new"}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Curso de Linux para iniciantes"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`course-url-${topic.id}-${course?.id ?? "new"}`}>URL</Label>
            <Input
              id={`course-url-${topic.id}-${course?.id ?? "new"}`}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              className="h-11"
            />
          </div>

          {error ? <p className="wrap-break-word text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={isSaving} className="min-h-10">
              {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isEditing ? "Salvar alterações" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UserCourseList({
  topic,
  onAddCourse,
  onUpdateCourse,
  onToggleCourseFavorite,
  onToggleCourseCompleted,
  onDeleteCourse,
}: {
  topic: StudyTrailTopic
  onAddCourse: (topicId: string, course: StudyTrailUserCourse) => void
  onUpdateCourse: (topicId: string, course: StudyTrailUserCourse) => void
  onToggleCourseFavorite: (topicId: string, courseId: string) => void
  onToggleCourseCompleted: (topicId: string, courseId: string) => void
  onDeleteCourse: (topicId: string, courseId: string, courseTitle: string, topicTitle: string) => void
}) {
  const courses = topic.userCourses ?? []

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h4 className="text-base font-semibold text-foreground">Meus cursos</h4>
        <p className="wrap-break-word text-sm leading-6 text-muted-foreground">
          Cursos adicionados por você para esta matéria.
        </p>
      </div>

      <CourseDialog topic={topic} onSaveCourse={onAddCourse} />

      {courses.length > 0 ? (
        <div className="grid gap-2">
          {courses.map((course) => {
            const isFavorite = course.isFavorite === true
            const isCompleted = course.isCompleted === true

            return (
              <div
                key={course.id}
                className={cn(
                  "group rounded-xl border border-border/70 bg-background/75 px-3 py-2 transition-colors hover:bg-muted",
                  isCompleted ? "opacity-80" : "",
                )}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="wrap-break-word block text-sm font-medium text-foreground group-hover:text-primary">
                      {course.title}
                    </span>
                    <span className="wrap-break-word block text-sm leading-6 text-muted-foreground">
                      {getCoursePlatformLabel(course)}
                    </span>
                  </a>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={cn(isFavorite ? "text-primary" : "text-muted-foreground")}
                      onClick={() => onToggleCourseFavorite(topic.id, course.id)}
                      aria-pressed={isFavorite}
                      aria-label={isFavorite ? "Remover curso dos favoritos" : "Favoritar curso"}
                      title={isFavorite ? "Remover curso dos favoritos" : "Favoritar curso"}
                    >
                      <Star className={cn("size-4", isFavorite ? "fill-current" : "")} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={cn(isCompleted ? "text-primary" : "text-muted-foreground")}
                      onClick={() => onToggleCourseCompleted(topic.id, course.id)}
                      aria-pressed={isCompleted}
                      aria-label={isCompleted ? "Marcar curso como não concluído" : "Marcar curso como concluído"}
                      title={isCompleted ? "Marcar curso como não concluído" : "Marcar curso como concluído"}
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </Button>
                    <CourseDialog topic={topic} course={course} onSaveCourse={onUpdateCourse} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteCourse(topic.id, course.id, course.title, topic.title)}
                      aria-label="Excluir curso"
                      title="Excluir curso"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="wrap-break-word rounded-xl border border-dashed border-border/70 px-3 py-3 text-sm leading-6 text-muted-foreground">
          Você ainda não adicionou cursos para este tema.
        </p>
      )}
    </div>
  )
}

function TopicDetails({
  topic,
  topicIndex,
  onSelectFocus,
  onToggleResourceFavorite,
  onToggleResourceStudied,
  onDeleteResource,
  onAddCourse,
  onUpdateCourse,
  onToggleCourseFavorite,
  onToggleCourseCompleted,
  onDeleteCourse,
}: {
  topic: StudyTrailTopic | null
  topicIndex: number
  onSelectFocus: (topicId: string, focusId: string) => void
  onToggleResourceFavorite: (topicId: string, resourceId: string) => void
  onToggleResourceStudied: (topicId: string, resourceId: string) => void
  onDeleteResource: (topicId: string, resourceId: string, resourceTitle: string, topicTitle: string) => void
  onAddCourse: (topicId: string, course: StudyTrailUserCourse) => void
  onUpdateCourse: (topicId: string, course: StudyTrailUserCourse) => void
  onToggleCourseFavorite: (topicId: string, courseId: string) => void
  onToggleCourseCompleted: (topicId: string, courseId: string) => void
  onDeleteCourse: (topicId: string, courseId: string, courseTitle: string, topicTitle: string) => void
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-6">
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
              <h4 className="text-base font-semibold text-foreground">Recomendação do MentorIA</h4>

              <div className="space-y-2">
                <h5 className="text-base font-semibold text-foreground">Recursos gratuitos</h5>
                <ResourceLinkList
                  resources={resources}
                  emptyMessage={emptyResourceMessage}
                  topic={topic}
                  onToggleFavorite={onToggleResourceFavorite}
                  onToggleStudied={onToggleResourceStudied}
                  onDeleteResource={onDeleteResource}
                />
              </div>

              <div className="space-y-2">
                <h5 className="text-base font-semibold text-foreground">Vídeos e canais</h5>
                <ResourceLinkList
                  resources={videoResources}
                  emptyMessage={emptyVideoMessage}
                  topic={topic}
                  onToggleFavorite={onToggleResourceFavorite}
                  onToggleStudied={onToggleResourceStudied}
                  onDeleteResource={onDeleteResource}
                />
              </div>
            </div>
          </div>

          <UserCourseList
            topic={topic}
            onAddCourse={onAddCourse}
            onUpdateCourse={onUpdateCourse}
            onToggleCourseFavorite={onToggleCourseFavorite}
            onToggleCourseCompleted={onToggleCourseCompleted}
            onDeleteCourse={onDeleteCourse}
          />
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

  const updateActiveTrailTopic = (
    topicId: string,
    updater: (topic: StudyTrailTopic) => StudyTrailTopic,
  ) => {
    if (!activeTrail) return

    const updatedTrail = {
      ...activeTrail,
      topics: activeTrail.topics.map((topic) => (topic.id === topicId ? updater(topic) : topic)),
    }

    saveMentorTrails([updatedTrail])
    setTrails([updatedTrail])
    setSelectedTopicId(topicId)
  }

  const handleSelectTopicFocus = (topicId: string, focusId: string) => {
    updateActiveTrailTopic(topicId, (topic) => applyStudyTopicFocus(topic, focusId))
  }

  const handleToggleResourceFavorite = (topicId: string, resourceId: string) => {
    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      favoriteResourceIds: toggleResourceId(topic.favoriteResourceIds, resourceId),
      hiddenResourceIds: removeResourceId(topic.hiddenResourceIds, resourceId),
    }))
  }

  const handleToggleResourceStudied = (topicId: string, resourceId: string) => {
    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      studiedResourceIds: toggleResourceId(topic.studiedResourceIds, resourceId),
      hiddenResourceIds: removeResourceId(topic.hiddenResourceIds, resourceId),
    }))
  }

  const handleDeleteResource = (topicId: string, resourceId: string, resourceTitle: string, topicTitle: string) => {
    const confirmed = window.confirm(
      `Excluir o recurso "${resourceTitle}" da matéria "${topicTitle}"?`,
    )

    if (!confirmed) return

    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      resources: topic.resources.filter((resource) => resource.id !== resourceId),
      videoResources: (topic.videoResources ?? []).filter((resource) => resource.id !== resourceId),
      hiddenResourceIds: removeResourceId(topic.hiddenResourceIds, resourceId),
      favoriteResourceIds: removeResourceId(topic.favoriteResourceIds, resourceId),
      studiedResourceIds: removeResourceId(topic.studiedResourceIds, resourceId),
    }))
  }

  const handleAddCourse = (topicId: string, course: StudyTrailUserCourse) => {
    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      userCourses: [course, ...(topic.userCourses ?? [])],
    }))
  }

  const handleUpdateCourse = (topicId: string, updatedCourse: StudyTrailUserCourse) => {
    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      userCourses: (topic.userCourses ?? []).map((course) =>
        course.id === updatedCourse.id ? updatedCourse : course,
      ),
    }))
  }

  const handleToggleCourseFavorite = (topicId: string, courseId: string) => {
    const now = new Date().toISOString()

    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      userCourses: (topic.userCourses ?? []).map((course) =>
        course.id === courseId
          ? { ...course, isFavorite: course.isFavorite !== true, updatedAt: now }
          : course,
      ),
    }))
  }

  const handleToggleCourseCompleted = (topicId: string, courseId: string) => {
    const now = new Date().toISOString()

    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      userCourses: (topic.userCourses ?? []).map((course) => {
        if (course.id !== courseId) return course

        const isCompleted = course.isCompleted !== true

        return {
          ...course,
          isCompleted,
          completedAt: isCompleted ? now : null,
          updatedAt: now,
        }
      }),
    }))
  }

  const handleDeleteCourse = (topicId: string, courseId: string, courseTitle: string, topicTitle: string) => {
    const confirmed = window.confirm(`Excluir o curso "${courseTitle}" da matéria "${topicTitle}"?`)

    if (!confirmed) return

    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      userCourses: (topic.userCourses ?? []).filter((course) => course.id !== courseId),
    }))
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
                  <span className="flex min-h-10 flex-1 items-center px-1 text-sm text-muted-foreground">
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
            <TopicDetails
              topic={selectedTopic}
              topicIndex={selectedTopicIndex}
              onSelectFocus={handleSelectTopicFocus}
              onToggleResourceFavorite={handleToggleResourceFavorite}
              onToggleResourceStudied={handleToggleResourceStudied}
              onDeleteResource={handleDeleteResource}
              onAddCourse={handleAddCourse}
              onUpdateCourse={handleUpdateCourse}
              onToggleCourseFavorite={handleToggleCourseFavorite}
              onToggleCourseCompleted={handleToggleCourseCompleted}
              onDeleteCourse={handleDeleteCourse}
            />
          </section>
        </div>
      )}
    </div>
  )
}
