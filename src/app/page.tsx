"use client"

import { useEffect, useState } from "react"
import { AppHeader } from "@/components/layout/app-header"
import { CalendarioView } from "@/features/calendar/components/calendar-view"
import { RoutineView } from "@/features/routine/components/routine-view"
import { SettingsView } from "@/features/settings/components/settings-view"
import { RoutineBuilderView } from "@/features/routine-builder/components/routine-builder-view"
import { STORAGE_KEYS } from "@/constants/storage"
import type { ViewKey } from "@/types/navigation"

const VIEW_KEYS: ViewKey[] = ["rotina", "calendario", "configuracoes", "configurar-rotina"]

function isViewKey(value: string | null): value is ViewKey {
  return value !== null && VIEW_KEYS.includes(value as ViewKey)
}

export default function Page() {
  const [view, setCurrentView] = useState<ViewKey>("rotina")

  useEffect(() => {
    const storedView = window.localStorage.getItem(STORAGE_KEYS.view)

    if (isViewKey(storedView)) {
      setCurrentView(storedView)
    }
  }, [])

  const navigateToView = (nextView: ViewKey) => {
    setCurrentView(nextView)
    window.localStorage.setItem(STORAGE_KEYS.view, nextView)
  }

  return (
    <div className="min-h-svh overflow-x-hidden bg-background">
      <AppHeader activeView={view} onNavigate={navigateToView} />
      <main
        className={
          view === "configurar-rotina"
            ? "mx-auto w-full max-w-[1800px] overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8"
            : "mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8"
        }
      >
        {view === "rotina" ? <RoutineView /> : null}
        {view === "calendario" ? <CalendarioView /> : null}
        {view === "configuracoes" ? <SettingsView onNavigate={navigateToView} /> : null}
        {view === "configurar-rotina" ? (
          <RoutineBuilderView
            onBackToSettings={() => navigateToView("configuracoes")}
            onNavigateToRoutine={() => navigateToView("rotina")}
          />
        ) : null}
      </main>
    </div>
  )
}
