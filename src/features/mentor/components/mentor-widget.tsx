"use client"

import { useEffect } from "react"
import { MentorChatPanel } from "@/features/mentor/components/mentor-chat-panel"
import type { ViewKey } from "@/types/navigation"

export function MentorWidget({
  currentView,
  isOpen,
  onClose,
}: {
  currentView: ViewKey
  isOpen: boolean
  onClose: () => void
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

  if (!isOpen) return null

  return (
    <aside
      className="fixed inset-x-3 bottom-3 top-20 z-[60] max-w-full sm:inset-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[min(72svh,680px)] sm:w-[min(440px,calc(100vw-2.5rem))]"
      aria-label="Painel do Mentor IA"
    >
      <MentorChatPanel currentView={currentView} onClose={onClose} />
    </aside>
  )
}
