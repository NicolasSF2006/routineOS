"use client"

import { PageHeading } from "@/components/shared/page-heading"
import { MentorChatPanel } from "@/features/mentor/components/mentor-chat-panel"
import type { ViewKey } from "@/types/navigation"

export function MentorView({ currentView }: { currentView: ViewKey }) {
  return (
    <div className="flex w-full max-w-full flex-col gap-5 overflow-x-hidden sm:gap-6">
      <PageHeading
        title="Mentor IA"
        description="Converse com seu mentor de estudos para revisar sua rotina, tirar dúvidas, sugerir projetos e organizar seus próximos passos."
        align="center"
      />

      <div className="mx-auto h-[min(72svh,720px)] min-h-[34rem] w-full max-w-4xl">
        <MentorChatPanel currentView={currentView} />
      </div>
    </div>
  )
}
