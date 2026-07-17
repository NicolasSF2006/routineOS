"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { PageHeading } from "@/components/shared/page-heading"
import { Button } from "@/components/ui/button"
import { STORAGE_EVENTS } from "@/constants/storage"
import { buildMentorContext } from "@/features/mentor/utils/mentor-context"
import {
  applyStudyTopicFocus,
  createStudyTrailSignatureFromContext,
  mergeStudyTrailUserState,
} from "@/features/mentor/utils/study-trail"
import { loadMentorTrails, saveMentorTrails } from "@/lib/storage"
import type {
  StudyTrail,
  StudyTrailApiResponse,
  StudyTrailTopic,
  StudyTrailUserCourse,
} from "@/features/mentor/types"

function toggleResourceId(
  resourceIds: string[] | undefined,
  resourceId: string,
): string[] {
  const currentIds = new Set(resourceIds ?? [])

  if (currentIds.has(resourceId)) {
    currentIds.delete(resourceId)
  } else {
    currentIds.add(resourceId)
  }

  return Array.from(currentIds)
}

function removeResourceId(
  resourceIds: string[] | undefined,
  resourceId: string,
): string[] {
  return (resourceIds ?? []).filter((id) => id !== resourceId)
}

import {
  TopicDetails,
  TopicList,
  TrailsEmptyState,
} from "@/features/trails/components/trails-content"
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
      if (
        current &&
        nextTrails[0]?.topics.some((topic) => topic.id === current)
      )
        return current
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
      window.removeEventListener(
        STORAGE_EVENTS.mentorTrailsChanged,
        refreshTrails,
      )
      window.removeEventListener(STORAGE_EVENTS.appDataChanged, refreshTrails)
    }
  }, [])

  const activeTrail = trails[0] ?? null
  const filteredTopics = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!activeTrail) return []
    if (!normalizedSearch) return activeTrail.topics

    return activeTrail.topics.filter((topic) =>
      topic.title.toLowerCase().includes(normalizedSearch),
    )
  }, [activeTrail, searchTerm])

  const selectedTopic = useMemo(() => {
    if (!activeTrail) return null
    const fallback = filteredTopics[0] ?? activeTrail.topics[0] ?? null
    return (
      activeTrail.topics.find((topic) => topic.id === selectedTopicId) ??
      fallback
    )
  }, [activeTrail, filteredTopics, selectedTopicId])

  const selectedTopicIndex = useMemo(() => {
    if (!activeTrail || !selectedTopic) return 0
    return Math.max(
      0,
      activeTrail.topics.findIndex((topic) => topic.id === selectedTopic.id),
    )
  }, [activeTrail, selectedTopic])

  const hasRoutineChanged = Boolean(
    activeTrail?.routineSignature &&
    currentRoutineSignature &&
    activeTrail.routineSignature !== currentRoutineSignature,
  )

  useEffect(() => {
    if (filteredTopics.length === 0) return
    if (
      !selectedTopicId ||
      !filteredTopics.some((topic) => topic.id === selectedTopicId)
    ) {
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
        (Partial<StudyTrailApiResponse> & { error?: string }) | null

      if (!response.ok || !payload?.trail) {
        throw new Error(
          payload?.error ?? "Não foi possível gerar a trilha agora.",
        )
      }

      const nextTrail = mergeStudyTrailUserState(payload.trail, activeTrail)

      saveMentorTrails([nextTrail])
      setTrails([nextTrail])
      setSelectedTopicId(nextTrail.topics[0]?.id ?? null)
      setSearchTerm("")
      setCurrentRoutineSignature(nextTrail.routineSignature ?? "")
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
      topics: activeTrail.topics.map((topic) =>
        topic.id === topicId ? updater(topic) : topic,
      ),
    }

    saveMentorTrails([updatedTrail])
    setTrails([updatedTrail])
    setSelectedTopicId(topicId)
  }

  const handleSelectTopicFocus = (topicId: string, focusId: string) => {
    updateActiveTrailTopic(topicId, (topic) =>
      applyStudyTopicFocus(topic, focusId),
    )
  }

  const handleToggleResourceFavorite = (
    topicId: string,
    resourceId: string,
  ) => {
    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      favoriteResourceIds: toggleResourceId(
        topic.favoriteResourceIds,
        resourceId,
      ),
      hiddenResourceIds: removeResourceId(topic.hiddenResourceIds, resourceId),
    }))
  }

  const handleToggleResourceStudied = (topicId: string, resourceId: string) => {
    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      studiedResourceIds: toggleResourceId(
        topic.studiedResourceIds,
        resourceId,
      ),
      hiddenResourceIds: removeResourceId(topic.hiddenResourceIds, resourceId),
    }))
  }

  const handleDeleteResource = (
    topicId: string,
    resourceId: string,
    resourceTitle: string,
    topicTitle: string,
  ) => {
    const confirmed = window.confirm(
      `Excluir o recurso "${resourceTitle}" da matéria "${topicTitle}"?`,
    )

    if (!confirmed) return

    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      resources: topic.resources.filter(
        (resource) => resource.id !== resourceId,
      ),
      videoResources: (topic.videoResources ?? []).filter(
        (resource) => resource.id !== resourceId,
      ),
      hiddenResourceIds: removeResourceId(topic.hiddenResourceIds, resourceId),
      favoriteResourceIds: removeResourceId(
        topic.favoriteResourceIds,
        resourceId,
      ),
      studiedResourceIds: removeResourceId(
        topic.studiedResourceIds,
        resourceId,
      ),
    }))
  }

  const handleAddCourse = (topicId: string, course: StudyTrailUserCourse) => {
    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      userCourses: [course, ...(topic.userCourses ?? [])],
    }))
  }

  const handleUpdateCourse = (
    topicId: string,
    updatedCourse: StudyTrailUserCourse,
  ) => {
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
          ? {
              ...course,
              isFavorite: course.isFavorite !== true,
              updatedAt: now,
            }
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

  const handleDeleteCourse = (
    topicId: string,
    courseId: string,
    courseTitle: string,
    topicTitle: string,
  ) => {
    const confirmed = window.confirm(
      `Excluir o curso "${courseTitle}" da matéria "${topicTitle}"?`,
    )

    if (!confirmed) return

    updateActiveTrailTopic(topicId, (topic) => ({
      ...topic,
      userCourses: (topic.userCourses ?? []).filter(
        (course) => course.id !== courseId,
      ),
    }))
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
      <PageHeading title="Trilhas de estudo" align="center" />

      {error ? (
        <div className="border-destructive/25 bg-destructive/10 text-destructive rounded-2xl border px-4 py-3 text-sm wrap-break-word">
          {error}
        </div>
      ) : null}

      {trails.length === 0 ? (
        <TrailsEmptyState
          onGenerate={handleGenerateTrail}
          isGenerating={isGenerating}
        />
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(19rem,23rem)_1fr]">
          <section className="min-w-0 space-y-3" aria-label="Temas da trilha">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
              <h3 className="text-foreground text-xl font-semibold">
                Temas da trilha
              </h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={hasRoutineChanged ? "default" : "outline"}
                  onClick={handleGenerateTrail}
                  disabled={isGenerating}
                  className="min-h-10 flex-1"
                >
                  {isGenerating ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Plus className="size-4" aria-hidden="true" />
                  )}
                  {hasRoutineChanged ? "Atualizar trilha" : "Regenerar trilha"}
                </Button>
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
