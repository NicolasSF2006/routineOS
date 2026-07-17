"use client"

import { useEffect } from "react"
import { Bot } from "lucide-react"
import { MentorChatPanel } from "@/features/mentor/components/mentor-chat-panel"
import type { ViewKey } from "@/types/navigation"

export function MentorWidget({
  currentView,
  isOpen,
  onOpen,
  onClose,
  onNavigate,
}: {
  currentView: ViewKey
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onNavigate: (view: ViewKey) => void
}) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {isOpen ? (
        <aside
          className="fixed inset-x-3 top-20 bottom-3 z-[60] max-w-full sm:inset-auto sm:top-auto sm:right-5 sm:bottom-5 sm:h-[min(72svh,680px)] sm:w-[min(440px,calc(100vw-2.5rem))]"
          aria-label="Painel do Mentor IA"
        >
          <MentorChatPanel
            currentView={currentView}
            onClose={onClose}
            onNavigate={onNavigate}
          />
        </aside>
      ) : null}

      {!isOpen ? (
        <aside
          className="fixed right-5 bottom-22 z-[55] hidden items-center gap-2 lg:flex"
          aria-label="Atalho do Mentor IA"
        >
          <div className="group flex items-center gap-2">
            <span className="border-border/70 bg-popover text-popover-foreground pointer-events-none translate-x-2 rounded-full border px-3 py-2 text-sm font-medium opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
              Mentor IA
            </span>
            <button
              type="button"
              className="border-primary/30 bg-primary text-primary-foreground shadow-primary/20 focus-visible:ring-ring focus-visible:ring-offset-background flex size-14 items-center justify-center rounded-full border shadow-2xl transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={onOpen}
              aria-label="Abrir Mentor IA"
              title="Abrir Mentor IA"
            >
              <Bot className="size-6" aria-hidden="true" />
            </button>
          </div>
        </aside>
      ) : null}
    </>
  )
}
