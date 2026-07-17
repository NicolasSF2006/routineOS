"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import {
  BookOpen,
  Check,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react"
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
import { cn } from "@/lib/utils"
import type {
  StudyTrailTopic,
  StudyTrailUserCourse,
} from "@/features/mentor/types"

function formatPlannedTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h${String(minutes).padStart(2, "0")}`
}

function formatTopicMeta(topic: StudyTrailTopic): string {
  const parts: string[] = []

  if (topic.occurrenceCount && topic.occurrenceCount > 0) {
    parts.push(
      `${topic.occurrenceCount} ocorrência${topic.occurrenceCount === 1 ? "" : "s"} no mês`,
    )
  }

  if (topic.totalMinutes && topic.totalMinutes > 0) {
    parts.push(`${formatPlannedTime(topic.totalMinutes)} planejados no mês`)
  }

  return parts.join(" • ")
}

export function createCourseId(): string {
  return `user-course-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function normalizeCourseUrl(value: string): string {
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
    (item) =>
      normalized === item.hostname || normalized.endsWith(`.${item.hostname}`),
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
  return (
    getFriendlyPlatformLabel(platform ?? "") ??
    (platform || getUrlFallbackLabel(course.url))
  )
}

export function TrailsEmptyState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void
  isGenerating: boolean
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 px-4 py-10 text-center sm:px-8">
        <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
          <BookOpen className="size-7" aria-hidden="true" />
        </span>
        <div className="max-w-2xl space-y-2">
          <h3 className="text-foreground text-xl font-semibold">
            Nenhuma trilha salva ainda
          </h3>
          <p className="text-muted-foreground text-sm leading-6 wrap-break-word">
            Gere uma trilha com os temas únicos encontrados no mês inteiro da
            sua rotina.
          </p>
        </div>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="min-h-11"
        >
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Gerar trilha da rotina completa
        </Button>
      </CardContent>
    </Card>
  )
}

export function TopicList({
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
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
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
                  "focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  isSelected
                    ? "border-primary/70 bg-primary/10"
                    : "border-border/70 bg-card hover:bg-muted/40",
                )}
                aria-pressed={isSelected}
              >
                <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-semibold">
                  {index + 1}
                </span>
                <span className="text-foreground min-w-0 text-base font-semibold wrap-break-word">
                  {topic.title}
                </span>
              </button>
            )
          })
        ) : (
          <p className="border-border text-muted-foreground rounded-2xl border border-dashed px-4 py-6 text-sm wrap-break-word">
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
  onDeleteResource: (
    topicId: string,
    resourceId: string,
    resourceTitle: string,
    topicTitle: string,
  ) => void
}) {
  const hiddenIds = new Set(topic.hiddenResourceIds ?? [])
  const favoriteIds = new Set(topic.favoriteResourceIds ?? [])
  const studiedIds = new Set(topic.studiedResourceIds ?? [])
  const visibleResources = resources.filter(
    (resource) => !hiddenIds.has(resource.id),
  )

  if (visibleResources.length === 0) {
    return (
      <p className="border-border/70 text-muted-foreground rounded-xl border border-dashed px-3 py-3 text-sm leading-6 wrap-break-word">
        {resources.length > 0
          ? "Todos os recursos desta seção foram ocultados."
          : emptyMessage}
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
              "group border-border/70 bg-background/75 hover:bg-muted rounded-xl border px-3 py-2 transition-colors",
              isStudied ? "opacity-80" : "",
            )}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="focus-visible:ring-ring min-w-0 flex-1 focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="text-foreground group-hover:text-primary block text-sm font-medium wrap-break-word">
                  {resource.title}
                </span>
                <span className="text-muted-foreground block text-sm leading-6 wrap-break-word">
                  {resource.provider} • {resource.type} • {resource.language}
                </span>
              </a>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    isFavorite ? "text-primary" : "text-muted-foreground",
                  )}
                  onClick={() => onToggleFavorite(topic.id, resource.id)}
                  aria-pressed={isFavorite}
                  aria-label={
                    isFavorite ? "Remover dos favoritos" : "Favoritar recurso"
                  }
                  title={
                    isFavorite ? "Remover dos favoritos" : "Favoritar recurso"
                  }
                >
                  <Star
                    className={cn("size-4", isFavorite ? "fill-current" : "")}
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    isStudied ? "text-primary" : "text-muted-foreground",
                  )}
                  onClick={() => onToggleStudied(topic.id, resource.id)}
                  aria-pressed={isStudied}
                  aria-label={
                    isStudied
                      ? "Marcar como não estudado"
                      : "Marcar como estudado"
                  }
                  title={
                    isStudied
                      ? "Marcar como não estudado"
                      : "Marcar como estudado"
                  }
                >
                  <Check className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    onDeleteResource(
                      topic.id,
                      resource.id,
                      resource.title,
                      topic.title,
                    )
                  }
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
      const payload = (await response.json().catch(() => null)) as {
        platform?: string
      } | null

      if (!response.ok) {
        return getUrlFallbackLabel(normalizedUrl)
      }

      return typeof payload?.platform === "string" &&
        payload.platform.trim().length > 0
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
    const shouldResolvePlatform =
      !course || course.url !== normalizedUrl || !course.platform
    const platform = shouldResolvePlatform
      ? await resolvePlatform(normalizedUrl)
      : course.platform

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
        <Button
          type="button"
          variant="outline"
          className="min-h-10 w-full"
          onClick={openDialog}
        >
          <Plus className="size-4" aria-hidden="true" />
          Adicionar curso
        </Button>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl wrap-break-word">
            {isEditing
              ? `Editar curso em ${topic.title}`
              : `Adicionar curso em ${topic.title}`}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`course-title-${topic.id}-${course?.id ?? "new"}`}>
              Nome do curso
            </Label>
            <Input
              id={`course-title-${topic.id}-${course?.id ?? "new"}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Curso de Linux para iniciantes"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`course-url-${topic.id}-${course?.id ?? "new"}`}>
              URL
            </Label>
            <Input
              id={`course-url-${topic.id}-${course?.id ?? "new"}`}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              className="h-11"
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm wrap-break-word">{error}</p>
          ) : null}

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={isSaving} className="min-h-10">
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
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
  onDeleteCourse: (
    topicId: string,
    courseId: string,
    courseTitle: string,
    topicTitle: string,
  ) => void
}) {
  const courses = topic.userCourses ?? []

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h4 className="text-foreground text-base font-semibold">Meus cursos</h4>
        <p className="text-muted-foreground text-sm leading-6 wrap-break-word">
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
                  "group border-border/70 bg-background/75 hover:bg-muted rounded-xl border px-3 py-2 transition-colors",
                  isCompleted ? "opacity-80" : "",
                )}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-visible:ring-ring min-w-0 flex-1 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="text-foreground group-hover:text-primary block text-sm font-medium wrap-break-word">
                      {course.title}
                    </span>
                    <span className="text-muted-foreground block text-sm leading-6 wrap-break-word">
                      {getCoursePlatformLabel(course)}
                    </span>
                  </a>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        isFavorite ? "text-primary" : "text-muted-foreground",
                      )}
                      onClick={() =>
                        onToggleCourseFavorite(topic.id, course.id)
                      }
                      aria-pressed={isFavorite}
                      aria-label={
                        isFavorite
                          ? "Remover curso dos favoritos"
                          : "Favoritar curso"
                      }
                      title={
                        isFavorite
                          ? "Remover curso dos favoritos"
                          : "Favoritar curso"
                      }
                    >
                      <Star
                        className={cn(
                          "size-4",
                          isFavorite ? "fill-current" : "",
                        )}
                        aria-hidden="true"
                      />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className={cn(
                        isCompleted ? "text-primary" : "text-muted-foreground",
                      )}
                      onClick={() =>
                        onToggleCourseCompleted(topic.id, course.id)
                      }
                      aria-pressed={isCompleted}
                      aria-label={
                        isCompleted
                          ? "Marcar curso como não concluído"
                          : "Marcar curso como concluído"
                      }
                      title={
                        isCompleted
                          ? "Marcar curso como não concluído"
                          : "Marcar curso como concluído"
                      }
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </Button>
                    <CourseDialog
                      topic={topic}
                      course={course}
                      onSaveCourse={onUpdateCourse}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        onDeleteCourse(
                          topic.id,
                          course.id,
                          course.title,
                          topic.title,
                        )
                      }
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
        <p className="border-border/70 text-muted-foreground rounded-xl border border-dashed px-3 py-3 text-sm leading-6 wrap-break-word">
          Você ainda não adicionou cursos para este tema.
        </p>
      )}
    </div>
  )
}

export function TopicDetails({
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
  onDeleteResource: (
    topicId: string,
    resourceId: string,
    resourceTitle: string,
    topicTitle: string,
  ) => void
  onAddCourse: (topicId: string, course: StudyTrailUserCourse) => void
  onUpdateCourse: (topicId: string, course: StudyTrailUserCourse) => void
  onToggleCourseFavorite: (topicId: string, courseId: string) => void
  onToggleCourseCompleted: (topicId: string, courseId: string) => void
  onDeleteCourse: (
    topicId: string,
    courseId: string,
    courseTitle: string,
    topicTitle: string,
  ) => void
}) {
  if (!topic) {
    return (
      <Card className="h-full">
        <CardContent className="text-muted-foreground flex min-h-64 items-center justify-center p-6 text-center text-sm">
          Selecione um tema para ver como estudar e quais recursos gratuitos
          usar.
        </CardContent>
      </Card>
    )
  }

  const topicTitle = topic.selectedFocusLabel
    ? `${topic.title} — ${topic.selectedFocusLabel}`
    : topic.title
  const needsFocus =
    topic.isBroad === true &&
    !topic.selectedFocusId &&
    (topic.focusOptions?.length ?? 0) > 0
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
          <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold">
            {topicIndex + 1}
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="text-foreground text-xl font-semibold wrap-break-word">
              {topicTitle}
            </h3>
            {formatTopicMeta(topic) ? (
              <p className="text-muted-foreground text-sm wrap-break-word">
                {formatTopicMeta(topic)}
              </p>
            ) : null}
          </div>
        </div>

        {topic.description ? (
          <p className="text-muted-foreground text-sm leading-6 wrap-break-word">
            {topic.description}
          </p>
        ) : null}

        {needsFocus ? (
          <div className="border-primary/20 bg-primary/10 space-y-3 rounded-2xl border p-4">
            <p className="text-foreground text-sm font-medium wrap-break-word">
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
              <h4 className="text-foreground text-base font-semibold">
                Como estudar
              </h4>
              <ul className="text-muted-foreground space-y-2 pl-5 text-sm leading-6">
                {topic.steps.map((step, stepIndex) => (
                  <li
                    key={`${topic.id}-step-${stepIndex}`}
                    className="list-disc wrap-break-word"
                  >
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {topic.projectSuggestion ? (
              <div className="border-primary/20 bg-primary/5 space-y-2 rounded-2xl border p-4">
                <h4 className="text-foreground text-base font-semibold">
                  Prática sugerida
                </h4>
                <p className="text-muted-foreground text-sm leading-6 wrap-break-word">
                  {topic.projectSuggestion}
                </p>
              </div>
            ) : null}

            <div className="space-y-5">
              <h4 className="text-foreground text-base font-semibold">
                Recomendação do MentorIA
              </h4>

              <div className="space-y-2">
                <h5 className="text-foreground text-base font-semibold">
                  Recursos gratuitos
                </h5>
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
                <h5 className="text-foreground text-base font-semibold">
                  Vídeos e canais
                </h5>
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
