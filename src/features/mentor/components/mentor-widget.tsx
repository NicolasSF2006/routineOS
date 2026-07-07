"use client"

import { useEffect, useState } from "react"
import { Bot } from "lucide-react"
import { MentorChatPanel } from "@/features/mentor/components/mentor-chat-panel"
import type { ViewKey } from "@/types/navigation"

export function MentorWidget({ currentView }: { currentView: ViewKey }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  return (
    <>
      {isOpen ? (
        <aside
          className="fixed inset-x-3 bottom-3 top-20 z-[60] max-w-full sm:inset-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[min(72svh,680px)] sm:w-[min(440px,calc(100vw-2.5rem))]"
          aria-label="Painel do Mentor IA"
        >
          <MentorChatPanel currentView={currentView} onClose={() => setIsOpen(false)} />
        </aside>
      ) : null}

      {!isOpen ? (
        <div className="fixed bottom-4 right-4 z-[55] flex items-center gap-2 sm:bottom-5 sm:right-5">
          <div className="group flex items-center gap-2">
            <span className="pointer-events-none hidden translate-x-2 rounded-full border border-border/70 bg-popover px-3 py-2 text-sm font-medium text-popover-foreground opacity-0 shadow-lg transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:block">
              Mentor IA
            </span>
            <button
              type="button"
              className="flex size-14 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-2xl shadow-primary/20 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => setIsOpen(true)}
              aria-label="Abrir Mentor IA"
              title="Abrir Mentor IA"
            >
              <Bot className="size-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
