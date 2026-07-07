import { Bot, Sparkles, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MentorMessage } from "@/features/mentor/types"

function formatMessageTime(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function MentorMessageBubble({
  message,
  isIntro = false,
}: {
  message: MentorMessage
  isIntro?: boolean
}) {
  const isUser = message.role === "user"
  const Icon = isUser ? User : Bot

  return (
    <div className={cn("flex w-full min-w-0 gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      ) : null}

      <div
        className={cn(
          "flex max-w-[min(100%,42rem)] min-w-0 flex-col gap-1 rounded-xl border px-3 py-2.5 shadow-sm sm:px-4 sm:py-3",
          isUser
            ? "border-primary/25 bg-primary text-primary-foreground"
            : "border-border/80 bg-muted/45 text-foreground",
        )}
      >
        {!isUser ? (
          <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Mentor IA
          </span>
        ) : null}
        <p className="wrap-break-word whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        {!isIntro ? (
          <span
            className={cn(
              "text-sm leading-none",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {formatMessageTime(message.createdAt)}
          </span>
        ) : null}
      </div>

      {isUser ? (
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  )
}
