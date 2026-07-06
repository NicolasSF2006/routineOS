"use client"

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react"
import { AlertCircle, Bot, Send, Sparkles, Trash2, User } from "lucide-react"
import { PageHeading } from "@/components/shared/page-heading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { STORAGE_EVENTS } from "@/constants/storage"
import { buildMentorContext } from "@/features/mentor/utils/mentor-context"
import { cn } from "@/lib/utils"
import { clearMentorChat, loadMentorChat, saveMentorChat } from "@/lib/storage"
import type { MentorApiResponse, MentorMessage } from "@/features/mentor/types"
import type { ViewKey } from "@/types/navigation"

const INTRO_MESSAGE: MentorMessage = {
  id: "mentor-intro",
  role: "assistant",
  content:
    "Olá! Eu sou seu mentor de estudos no RoutineOS. Posso te ajudar a revisar sua rotina, tirar dúvidas, sugerir projetos e organizar seus próximos passos.",
  createdAt: new Date(0).toISOString(),
}

const API_HISTORY_LIMIT = 16

function createMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `mentor-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createMessage(role: MentorMessage["role"], content: string): MentorMessage {
  return {
    id: createMessageId(),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

function formatMessageTime(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function MentorMessageBubble({ message, isIntro = false }: { message: MentorMessage; isIntro?: boolean }) {
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

export function MentorView({ currentView }: { currentView: ViewKey }) {
  const [messages, setMessages] = useState<MentorMessage[]>([])
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const refreshMessages = () => setMessages(loadMentorChat())

    refreshMessages()
    window.addEventListener("storage", refreshMessages)
    window.addEventListener(STORAGE_EVENTS.mentorChatChanged, refreshMessages)
    window.addEventListener(STORAGE_EVENTS.appDataChanged, refreshMessages)

    return () => {
      window.removeEventListener("storage", refreshMessages)
      window.removeEventListener(STORAGE_EVENTS.mentorChatChanged, refreshMessages)
      window.removeEventListener(STORAGE_EVENTS.appDataChanged, refreshMessages)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages, isLoading])

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()

    const content = draft.trim()
    if (!content || isLoading) return

    const userMessage = createMessage("user", content)
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    saveMentorChat(nextMessages)
    setDraft("")
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-API_HISTORY_LIMIT),
          context: buildMentorContext({ currentView }),
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | (Partial<MentorApiResponse> & { error?: string })
        | null

      if (!response.ok || !payload?.reply) {
        throw new Error(payload?.error ?? "Não foi possível falar com o Mentor IA agora.")
      }

      const assistantMessage = createMessage("assistant", payload.reply)
      const updatedMessages = [...nextMessages, assistantMessage]

      setMessages(updatedMessages)
      saveMentorChat(updatedMessages)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível falar com o Mentor IA agora.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  const handleClearConversation = () => {
    if (messages.length === 0) return

    const confirmed = window.confirm(
      "Limpar a conversa do Mentor IA? Essa ação remove o histórico local deste chat.",
    )

    if (!confirmed) return

    clearMentorChat()
    setMessages([])
    setError(null)
  }

  const visibleMessages = messages.length > 0 ? messages : [INTRO_MESSAGE]
  const canSend = draft.trim().length > 0 && !isLoading

  return (
    <div className="flex w-full max-w-full flex-col gap-5 overflow-x-hidden sm:gap-6">
      <PageHeading
        title="Mentor IA"
        description="Converse com seu mentor de estudos para revisar sua rotina, tirar dúvidas, sugerir projetos e organizar seus próximos passos."
        align="center"
      />

      <Card className="mx-auto w-full max-w-4xl p-0">
        <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-xl">Chat do Mentor</CardTitle>
                <CardDescription className="wrap-break-word">
                  Respostas com base na sua rotina, metas e progresso local.
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="min-h-10 whitespace-normal text-center sm:self-start"
              onClick={handleClearConversation}
              disabled={messages.length === 0 || isLoading}
              aria-label="Limpar conversa do Mentor IA"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Limpar conversa
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex h-[min(55svh,680px)] min-h-[23rem] flex-col p-0 sm:h-[min(70svh,680px)] sm:min-h-[34rem]">
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
            <div className="flex min-w-0 flex-col gap-3">
              {visibleMessages.map((message) => (
                <MentorMessageBubble
                  key={message.id}
                  message={message}
                  isIntro={message.id === INTRO_MESSAGE.id}
                />
              ))}

              {isLoading ? (
                <div className="flex w-full min-w-0 justify-start gap-2">
                  <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="size-4" aria-hidden="true" />
                  </span>
                  <div className="rounded-xl border border-border/80 bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
                    Mentor está pensando...
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {error ? (
            <div className="mx-3 mb-3 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mx-5">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="wrap-break-word">{error}</span>
            </div>
          ) : null}

          <form className="border-t border-border/70 p-3 sm:p-4" onSubmit={(event) => void handleSubmit(event)}>
            <label htmlFor="mentor-message" className="sr-only">
              Mensagem para o Mentor IA
            </label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
              <textarea
                id="mentor-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre sua rotina, dúvidas de estudo ou próximos passos..."
                aria-label="Mensagem para o Mentor IA"
                rows={2}
                className="wrap-break-word min-h-20 w-full min-w-0 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 sm:min-h-12"
                disabled={isLoading}
              />
              <Button type="submit" className="min-h-11 sm:min-w-28" disabled={!canSend}>
                <Send className="size-4" aria-hidden="true" />
                Enviar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
