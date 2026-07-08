"use client"

import { ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FreeStudyResource, StudyTrailTopic } from "@/features/mentor/types"

function ResourceLinkList({
  resources,
  emptyMessage,
  topicId,
}: {
  resources: FreeStudyResource[]
  emptyMessage: string
  topicId: string
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
      {resources.map((resource, index) => (
        <a
          key={`${topicId}-modal-${resource.id}-${index}`}
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

export function StudyTopicDialog({
  open,
  topic,
  onOpenChange,
}: {
  open: boolean
  topic: StudyTrailTopic | null
  onOpenChange: (open: boolean) => void
}) {
  const topicTitle = topic?.selectedFocusLabel ? `${topic.title} — ${topic.selectedFocusLabel}` : topic?.title ?? "Estudo"
  const needsFocus = topic?.isBroad === true && !topic.selectedFocusId && (topic.focusOptions?.length ?? 0) > 0
  const resources = topic?.resources ?? []
  const videoResources = topic?.videoResources ?? []
  const emptyResourceMessage = needsFocus
    ? "Este tema precisa de um foco na área Trilhas para mostrar recursos mais precisos."
    : "Ainda não há recursos confiáveis cadastrados para este tema."
  const emptyVideoMessage = needsFocus
    ? "Este tema precisa de um foco na área Trilhas para mostrar vídeos e canais mais precisos."
    : "Ainda não há vídeos ou canais confiáveis cadastrados para este tema."

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="wrap-break-word text-xl">{topicTitle}</DialogTitle>
        </DialogHeader>

        {topic ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-2">
              <h4 className="text-base font-semibold text-foreground">Como estudar</h4>
              <ul className="space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                {topic.steps.map((step, index) => (
                  <li key={`${topic.id}-modal-step-${index}`} className="wrap-break-word list-disc">
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <h4 className="text-base font-semibold text-foreground">Recursos gratuitos</h4>
                <ResourceLinkList resources={resources} emptyMessage={emptyResourceMessage} topicId={topic.id} />
              </div>

              <div className="space-y-2">
                <h4 className="text-base font-semibold text-foreground">Vídeos e canais</h4>
                <ResourceLinkList resources={videoResources} emptyMessage={emptyVideoMessage} topicId={topic.id} />
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
