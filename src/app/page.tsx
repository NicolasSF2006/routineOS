"use client"

import { useState } from "react"
import { AppHeader } from "@/components/layout/app-header"
import { CalendarioView } from "@/features/calendar/components/calendar-view"
import { RoutineView } from "@/features/routine/components/routine-view"
import { SettingsView } from "@/features/settings/components/settings-view"
import { RoutineBuilderView } from "@/features/routine-builder/components/routine-builder-view"
import type { ViewKey } from "@/types/navigation"

export default function Page() {
  const [view, setView] = useState<ViewKey>("rotina")

  return (
    <div className="min-h-svh bg-background">
      <AppHeader activeView={view} onNavigate={setView} />
      <main
        className={
          view === "configurar-rotina"
            ? "mx-auto max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8"
            : "mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8"
        }
      >
        {view === "rotina" ? <RoutineView /> : null}
        {view === "calendario" ? <CalendarioView /> : null}
        {view === "configuracoes" ? <SettingsView onNavigate={setView} /> : null}
        {view === "configurar-rotina" ? (
          <RoutineBuilderView
            onBackToSettings={() => setView("configuracoes")}
            onNavigateToRoutine={() => setView("rotina")}
          />
        ) : null}
      </main>
    </div>
  )
}
