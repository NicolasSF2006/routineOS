import {
  createStudyTrailFromContext,
  createStudyTrailSignatureFromContext,
  mergeStudyTrailUserState,
} from "@/features/mentor/utils/study-trail"
import { createMentorContext } from "../../fixtures/mentor"

describe("geração e regeneração de trilhas", () => {
  it("agrupa temas e calcula ocorrências e minutos planejados", () => {
    const context = createMentorContext()
    const trail = createStudyTrailFromContext(context)

    expect(trail.topics).toHaveLength(1)
    expect(trail.topics[0]).toMatchObject({
      title: "TypeScript",
      occurrenceCount: 2,
      totalMinutes: 100,
    })
    expect(trail.topics[0].resources.length).toBeGreaterThan(0)
  })

  it("altera a assinatura quando a rotina muda", () => {
    const context = createMentorContext()
    const firstSignature = createStudyTrailSignatureFromContext(context)
    context.monthRoutine.topics[0].totalMinutes = 150

    expect(createStudyTrailSignatureFromContext(context)).not.toBe(
      firstSignature,
    )
  })

  it("preserva cursos, favoritos, concluídos e recursos ocultos ao regenerar", () => {
    const context = createMentorContext()
    const previous = createStudyTrailFromContext(context)
    const topic = previous.topics[0]
    const resourceId = topic.resources[0]?.id
    topic.userCourses = [
      {
        id: "curso-1",
        title: "Curso próprio",
        url: "https://example.com/curso",
        platform: "Exemplo",
        createdAt: "2026-01-01T00:00:00.000Z",
        isFavorite: true,
        isCompleted: true,
        completedAt: "2026-01-02T00:00:00.000Z",
      },
    ]
    topic.favoriteResourceIds = resourceId ? [resourceId] : []
    topic.studiedResourceIds = resourceId ? [resourceId] : []
    topic.hiddenResourceIds = resourceId ? [resourceId] : []

    const merged = mergeStudyTrailUserState(
      createStudyTrailFromContext(context),
      previous,
    )
    const mergedTopic = merged.topics[0]

    expect(mergedTopic.userCourses).toEqual(topic.userCourses)
    expect(mergedTopic.favoriteResourceIds).toEqual(topic.favoriteResourceIds)
    expect(mergedTopic.studiedResourceIds).toEqual(topic.studiedResourceIds)
    expect(mergedTopic.hiddenResourceIds).toEqual(topic.hiddenResourceIds)
  })
})
