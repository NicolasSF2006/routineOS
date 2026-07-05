"use client"

import { useCallback, useEffect, useState } from "react"
import { DEFAULT_ROUTINE } from "@/constants/routine"
import { STORAGE_EVENTS } from "@/constants/storage"
import {
  clearStoredRoutine,
  getActiveRoutine,
  getStoredRoutine,
  saveStoredRoutine,
} from "@/lib/storage"
import type { Routine } from "@/types/study"

export function useRoutine() {
  const [routine, setRoutine] = useState<Routine>(DEFAULT_ROUTINE)
  const [hasCustomRoutine, setHasCustomRoutine] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const refreshRoutine = useCallback(() => {
    const storedRoutine = getStoredRoutine()
    setRoutine(storedRoutine ?? DEFAULT_ROUTINE)
    setHasCustomRoutine(Boolean(storedRoutine))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    refreshRoutine()

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key.includes("routine")) {
        refreshRoutine()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener(STORAGE_EVENTS.routineChanged, refreshRoutine)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener(STORAGE_EVENTS.routineChanged, refreshRoutine)
    }
  }, [refreshRoutine])

  const saveRoutine = useCallback((nextRoutine: Routine) => {
    saveStoredRoutine(nextRoutine)
    setRoutine(getActiveRoutine())
    setHasCustomRoutine(Boolean(getStoredRoutine()))
  }, [])

  const updateRoutine = useCallback((updater: (currentRoutine: Routine) => Routine) => {
    const nextRoutine = updater(getActiveRoutine())
    saveStoredRoutine(nextRoutine)
    setRoutine(getActiveRoutine())
    setHasCustomRoutine(Boolean(getStoredRoutine()))
  }, [])

  const resetRoutine = useCallback(() => {
    clearStoredRoutine()
    setRoutine(DEFAULT_ROUTINE)
    setHasCustomRoutine(false)
  }, [])

  return {
    routine,
    isLoading,
    saveRoutine,
    resetRoutine,
    updateRoutine,
    hasCustomRoutine,
  }
}
