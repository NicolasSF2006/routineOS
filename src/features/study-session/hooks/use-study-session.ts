"use client"

import { useCallback, useEffect, useState } from "react"
import {
  computeLiveActiveSeconds,
  computeLivePauseSeconds,
  createEmptyRecord,
  deriveControlState,
  finalizeActiveSegment,
  finalizeOpenPause,
  getDailyGoalSeconds,
} from "@/features/study-session/utils/study-session"
import { getTodayDateKey, nowIso } from "@/utils/date"
import { loadRecord, saveRecord } from "@/lib/storage"
import { useStudySettings } from "@/hooks/use-study-settings"
import type { DailyStudyRecord } from "@/types/study"

function persist(record: DailyStudyRecord) {
  saveRecord({ ...record, updatedAt: nowIso() })
}

export function useStudySession() {
  const { settings, hydrated: settingsHydrated } = useStudySettings()
  const [record, setRecord] = useState<DailyStudyRecord | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const dateKey = getTodayDateKey()
  const goalSeconds = getDailyGoalSeconds(settings)

  useEffect(() => {
    const stored = loadRecord(dateKey)
    setRecord(stored)
    setHydrated(true)
  }, [dateKey])

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const updateRecord = useCallback(
    (updater: (prev: DailyStudyRecord) => DailyStudyRecord) => {
      setRecord((prev) => {
        const base = prev ?? createEmptyRecord(dateKey)
        const next = updater(base)
        persist(next)
        return next
      })
    },
    [dateKey],
  )

  const markPresence = useCallback(() => {
    updateRecord((prev) => {
      if (prev.status === "canceled") {
        return {
          ...createEmptyRecord(dateKey),
          presenceAt: nowIso(),
          status: "in-progress",
        }
      }
      return {
        ...prev,
        presenceAt: nowIso(),
        status: "in-progress",
      }
    })
  }, [updateRecord, dateKey])

  const startStudy = useCallback(() => {
    const startedAt = nowIso()
    updateRecord((prev) => ({
      ...prev,
      studyStartedAt: prev.studyStartedAt ?? startedAt,
      activeSegmentStartedAt: startedAt,
      status: "in-progress",
    }))
  }, [updateRecord])

  const pauseStudy = useCallback(() => {
    const now = Date.now()
    updateRecord((prev) => {
      let next = finalizeActiveSegment(prev, now)
      next = {
        ...next,
        pauses: [
          ...next.pauses,
          { startedAt: new Date(now).toISOString(), endedAt: null, durationSeconds: 0 },
        ],
      }
      return next
    })
  }, [updateRecord])

  const resumeStudy = useCallback(() => {
    const now = Date.now()
    updateRecord((prev) => {
      let next = finalizeOpenPause(prev, now)
      next = {
        ...next,
        activeSegmentStartedAt: new Date(now).toISOString(),
        status: "in-progress",
      }
      return next
    })
  }, [updateRecord])

  const completeStudy = useCallback(() => {
    const now = Date.now()
    updateRecord((prev) => {
      let next = finalizeOpenPause(prev, now)
      next = finalizeActiveSegment(next, now)

      const bonusSeconds = Math.max(0, next.activeSeconds - goalSeconds)

      return {
        ...next,
        bonusSeconds,
        status: "completed",
        completedAt: new Date(now).toISOString(),
        activeSegmentStartedAt: null,
      }
    })
  }, [updateRecord, goalSeconds])

  const cancelDay = useCallback(() => {
    updateRecord((prev) => {
      const now = Date.now()
      let next = finalizeOpenPause(prev, now)
      next = finalizeActiveSegment(next, now)
      const activeSeconds = next.activeSeconds
      const bonusSeconds = Math.max(0, activeSeconds - goalSeconds)

      return {
        ...next,
        bonusSeconds,
        status: "canceled",
        canceledAt: new Date(now).toISOString(),
        completedAt: null,
        activeSegmentStartedAt: null,
      }
    })
  }, [updateRecord, goalSeconds])

  const resetDay = useCallback(() => {
    const empty = createEmptyRecord(dateKey)
    persist(empty)
    setRecord(empty)
  }, [dateKey])

  const activeSeconds = record ? computeLiveActiveSeconds(record, nowMs) : 0
  const pauseSeconds = record ? computeLivePauseSeconds(record, nowMs) : 0
  const controlState = deriveControlState(record)
  const metaReached = activeSeconds >= goalSeconds
  const bonusSeconds = Math.max(0, activeSeconds - goalSeconds)
  const progress = Math.min(100, goalSeconds > 0 ? (activeSeconds / goalSeconds) * 100 : 0)

  return {
    record,
    settings,
    controlState,
    activeSeconds,
    pauseSeconds,
    bonusSeconds,
    goalSeconds,
    metaReached,
    progress,
    hydrated: hydrated && settingsHydrated,
    markPresence,
    startStudy,
    pauseStudy,
    resumeStudy,
    completeStudy,
    cancelDay,
    resetDay,
  }
}
