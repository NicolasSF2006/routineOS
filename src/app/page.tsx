"use client"

import { useEffect, useState } from "react"
import { AppHeader } from "@/components/layout/app-header"
import { CalendarioView } from "@/features/calendar/components/calendar-view"
import { MentorWidget } from "@/features/mentor/components/mentor-widget"
import { RoutineView } from "@/features/routine/components/routine-view"
import { TrailsView } from "@/features/trails/components/trails-view"
import { SettingsView } from "@/features/settings/components/settings-view"
import { RoutineBuilderView } from "@/features/routine-builder/components/routine-builder-view"
import { STORAGE_EVENTS, STORAGE_KEYS } from "@/constants/storage"
import { OnboardingDialog } from "@/features/onboarding/components/onboarding-dialog"
import { completeOnboarding, hasCompletedOnboarding } from "@/lib/storage"
import type { ViewKey } from "@/types/navigation"

const VIEW_KEYS: ViewKey[] = ["rotina", "calendario", "trilhas", "configuracoes", "configurar-rotina"]

function isViewKey(value: string | null): value is ViewKey {
  return value !== null && VIEW_KEYS.includes(value as ViewKey)
}

export default function Page() {
  const [view, setCurrentView] = useState<ViewKey>("rotina")
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [isMentorOpen, setIsMentorOpen] = useState(false)

  useEffect(() => {
    const storedView = window.localStorage.getItem(STORAGE_KEYS.view)

    if (isViewKey(storedView)) {
      setCurrentView(storedView)
    } else if (storedView === "mentor") {
      window.localStorage.setItem(STORAGE_KEYS.view, "rotina")
    }

    setIsOnboardingOpen(!hasCompletedOnboarding())
  }, [])

  useEffect(() => {
    const handleAppDataChanged = () => {
      setIsOnboardingOpen(!hasCompletedOnboarding())
    }

    window.addEventListener(STORAGE_EVENTS.appDataChanged, handleAppDataChanged)
    return () => window.removeEventListener(STORAGE_EVENTS.appDataChanged, handleAppDataChanged)
  }, [])

  const handleCompleteOnboarding = () => {
    completeOnboarding()
    setIsOnboardingOpen(false)
  }

  const navigateToView = (nextView: ViewKey) => {
    setCurrentView(nextView)
    window.localStorage.setItem(STORAGE_KEYS.view, nextView)
  }

  return (
    <div className="min-h-svh overflow-x-hidden bg-background">
      <AppHeader
        activeView={view}
        onNavigate={navigateToView}
        onOpenMentor={() => setIsMentorOpen(true)}
      />
      <main
        className={
          view === "configurar-rotina"
            ? "mx-auto w-full max-w-[1800px] overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8"
            : "mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8"
        }
      >
        {view === "rotina" ? <RoutineView /> : null}
        {view === "calendario" ? <CalendarioView /> : null}
        {view === "trilhas" ? <TrailsView /> : null}
        {view === "configuracoes" ? (
          <SettingsView onNavigate={navigateToView} onOpenOnboarding={() => setIsOnboardingOpen(true)} />
        ) : null}
        {view === "configurar-rotina" ? (
          <RoutineBuilderView
            onBackToSettings={() => navigateToView("configuracoes")}
            onNavigateToRoutine={() => navigateToView("rotina")}
          />
        ) : null}
      </main>
      <OnboardingDialog open={isOnboardingOpen} onComplete={handleCompleteOnboarding} />
      <MentorWidget
        currentView={view}
        isOpen={isMentorOpen}
        onClose={() => setIsMentorOpen(false)}
      />
    </div>
  )
}
