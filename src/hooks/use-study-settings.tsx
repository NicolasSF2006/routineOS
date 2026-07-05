"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { DEFAULT_SETTINGS } from "@/constants/settings"
import { loadSettings, saveSettings } from "@/lib/storage"
import type { StudySettings } from "@/types/study"

interface StudySettingsContextValue {
  settings: StudySettings
  updateSettings: (patch: Partial<StudySettings>) => void
  setSettings: (next: StudySettings) => void
  hydrated: boolean
}

const StudySettingsContext = createContext<StudySettingsContextValue | undefined>(undefined)

export function StudySettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<StudySettings>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setSettingsState(loadSettings())
    setHydrated(true)
  }, [])

  const updateSettings = useCallback((patch: Partial<StudySettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const setSettings = useCallback((next: StudySettings) => {
    saveSettings(next)
    setSettingsState(next)
  }, [])

  return (
    <StudySettingsContext.Provider value={{ settings, updateSettings, setSettings, hydrated }}>
      {children}
    </StudySettingsContext.Provider>
  )
}

export function useStudySettings() {
  const ctx = useContext(StudySettingsContext)
  if (!ctx) {
    throw new Error("useStudySettings deve ser usado dentro de StudySettingsProvider")
  }
  return ctx
}
