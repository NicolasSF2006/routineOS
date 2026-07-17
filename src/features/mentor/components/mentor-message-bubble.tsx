import {
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  User,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { getMentorRoutineProposalStats } from "@/features/mentor/utils/mentor-routine-proposal"
import { cn } from "@/lib/utils"
import type { MentorAction, MentorMessage } from "@/features/mentor/types"

function formatMessageTime(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function repairMentorMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      const strongMarkerCount = line.match(/\*\*/g)?.length ?? 0

      if (line.trimStart().startsWith("**") && strongMarkerCount % 2 !== 0) {
        return `${line}**`
      }

      return line
    })
    .join("\n")
}

function MentorMessageContent({
  content,
  isUser,
}: {
  content: string
  isUser: boolean
}) {
  if (isUser) {
    return (
      <p className="text-sm leading-6 wrap-break-word whitespace-pre-wrap">
        {content}
      </p>
    )
  }

  return (
    <div className="min-w-0 text-sm leading-6 wrap-break-word">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="not-first:mt-3">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="marker:text-primary my-3 list-disc space-y-1 pl-5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="marker:text-primary my-3 list-decimal space-y-1 pl-5">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mt-4 text-lg font-semibold first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 text-base font-semibold first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 text-sm font-semibold first:mt-0">
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-primary/50 text-muted-foreground my-3 border-l-2 pl-3">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary decoration-primary/40 hover:decoration-primary font-medium underline underline-offset-4"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-background/80 rounded px-1.5 py-0.5 font-mono text-[0.8125rem]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-background/80 my-3 max-w-full overflow-x-auto rounded-lg border p-3 text-[0.8125rem] leading-5 [&_code]:bg-transparent [&_code]:p-0">
              {children}
            </pre>
          ),
          hr: () => <hr className="border-border my-4" />,
        }}
      >
        {repairMentorMarkdown(content)}
      </ReactMarkdown>
    </div>
  )
}

function RoutineProposalAction({
  action,
  onAction,
}: {
  action: Extract<MentorAction, { type: "preview-routine" | "propose-routine" }>
  onAction?: (action: MentorAction) => void
}) {
  const stats = getMentorRoutineProposalStats(action.routine)

  return (
    <div className="border-primary/20 bg-background/70 mt-1 rounded-xl border p-3">
      <div className="flex items-start gap-2">
        <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <CalendarClock className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold wrap-break-word">
            {action.routine.name}
          </p>
          <p className="text-muted-foreground mt-1 text-sm leading-5 wrap-break-word">
            {action.routine.summary}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {stats.dayCount} {stats.dayCount === 1 ? "dia" : "dias"} ·{" "}
            {stats.blockCount} {stats.blockCount === 1 ? "bloco" : "blocos"}
          </p>
        </div>
      </div>

      {action.type === "preview-routine" ? (
        <div className="border-primary/15 bg-primary/5 text-muted-foreground mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
          <CheckCircle2
            className="text-primary mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <p className="leading-5">
            Esta é uma prévia validada. Peça alterações ou responda “Pode criar
            a rotina”.
          </p>
        </div>
      ) : (
        <>
          <Button
            type="button"
            className="mt-3 w-full justify-between"
            onClick={() => onAction?.(action)}
            disabled={!onAction}
          >
            Abrir rascunho em Montar rotina
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <p className="text-muted-foreground mt-2 text-sm leading-5">
            A rotina atual só será substituída quando você revisar e clicar em
            Salvar.
          </p>
        </>
      )}
    </div>
  )
}

export function MentorMessageBubble({
  message,
  isIntro = false,
  onAction,
}: {
  message: MentorMessage
  isIntro?: boolean
  onAction?: (action: MentorAction) => void
}) {
  const isUser = message.role === "user"
  const Icon = isUser ? User : Bot

  return (
    <div
      className={cn(
        "flex w-full min-w-0 gap-2",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser ? (
        <span className="bg-primary/10 text-primary mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg">
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
          <span className="text-primary flex items-center gap-1.5 text-sm font-semibold tracking-wide uppercase">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Mentor IA
          </span>
        ) : null}
        <MentorMessageContent content={message.content} isUser={isUser} />
        {!isUser &&
        (message.action?.type === "preview-routine" ||
          message.action?.type === "propose-routine") ? (
          <RoutineProposalAction action={message.action} onAction={onAction} />
        ) : null}
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
        <span className="bg-primary text-primary-foreground mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  )
}
