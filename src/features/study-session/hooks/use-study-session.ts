"use client"

import { useCallback, useEffect, useState } from "react"
import {
  advanceToNextRoutineBlock,
  completeCurrentRoutineBlock,
  computeLiveActiveSeconds,
  computeLivePauseSeconds,
  computeLiveRoutineBlockElapsedSeconds,
  computeLiveRoutineBreakSeconds,
  createEmptyRecord,
  deriveControlState,
  finalizeCurrentRoutineSegment,
  finalizeOpenPause,
  getCountableBonusSeconds,
  getDailyGoalSeconds,
  getCurrentRoutineBlock,
  getOpenPause,
  getRoutineBlockDurationSeconds,
  hasNextRoutineBlock,
  isRoutineBreakBlock,
  startCurrentRoutineSegment,
} from "@/features/study-session/utils/study-session"
import { getTodayDateKey, nowIso } from "@/utils/date"
import { loadRecord, saveRecord } from "@/lib/storage"
import { useStudySettings } from "@/hooks/use-study-settings"
import type {
  ControlState,
  DailyStudyRecord,
  RoutineBlock,
  StudySettings,
} from "@/types/study"

function persist(record: DailyStudyRecord) {
  saveRecord({ ...record, updatedAt: nowIso() })
}

interface UseStudySessionOptions {
  dateKey?: string
  routineBlocks?: RoutineBlock[]
  hasRoutine?: boolean
  autoAdvance?: boolean
}

export interface UseStudySessionResult {
  record: DailyStudyRecord | null
  settings: StudySettings
  controlState: ControlState
  activeSeconds: number
  pauseSeconds: number
  routineBreakSeconds: number
  bonusSeconds: number
  goalSeconds: number
  metaReached: boolean
  progress: number
  hydrated: boolean
  currentBlock: RoutineBlock | null
  currentBlockIndex: number
  currentBlockElapsedSeconds: number
  currentBlockDurationSeconds: number
  currentBlockProgress: number
  nextBlock: RoutineBlock | null
  hasNextBlock: boolean
  isCurrentBlockRoutineBreak: boolean
  markPresence: () => void
  startStudy: () => void
  pauseStudy: () => void
  resumeStudy: () => void
  completeStudy: () => void
  cancelDay: () => void
  resumeCanceledDay: () => void
  advanceRoutineBlock: () => void
  resetDay: () => void
}

export function useStudySession({
  dateKey = getTodayDateKey(),
  routineBlocks = [],
  hasRoutine = true,
  autoAdvance = false,
}: UseStudySessionOptions = {}): UseStudySessionResult {
  const { settings, hydrated: settingsHydrated } = useStudySettings()
  const [record, setRecord] = useState<DailyStudyRecord | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const goalSeconds = getDailyGoalSeconds(settings)

  useEffect(() => {
    setHydrated(false)
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

  useEffect(() => {
    if (!record || !hasRoutine || routineBlocks.length === 0) return
    if (record.status !== "in-progress" || !record.studyStartedAt) return
    if (getOpenPause(record)) return

    if (record.awaitingNextBlock) {
      if (!autoAdvance || !hasNextRoutineBlock(record, routineBlocks)) return

      updateRecord((prev) => {
        if (!prev.awaitingNextBlock || prev.status !== "in-progress") return prev
        return advanceToNextRoutineBlock(prev, routineBlocks, Date.now())
      })
      return
    }

    const block = getCurrentRoutineBlock(record, routineBlocks)
    const durationSeconds = getRoutineBlockDurationSeconds(block)
    if (!block || durationSeconds <= 0) return

    const elapsedSeconds = computeLiveRoutineBlockElapsedSeconds(record, block, nowMs)
    if (elapsedSeconds < durationSeconds) return

    updateRecord((prev) => {
      if (prev.status !== "in-progress" || prev.awaitingNextBlock) return prev

      const currentBlock = getCurrentRoutineBlock(prev, routineBlocks)
      const currentDurationSeconds = getRoutineBlockDurationSeconds(currentBlock)
      if (!currentBlock || currentDurationSeconds <= 0) return prev

      const next = completeCurrentRoutineBlock(prev, routineBlocks, nowMs)

      if (autoAdvance) {
        return advanceToNextRoutineBlock(next, routineBlocks, nowMs)
      }

      return {
        ...next,
        awaitingNextBlock: true,
        activeSegmentStartedAt: null,
        routineBreakSegmentStartedAt: null,
      }
    })
  }, [autoAdvance, hasRoutine, nowMs, record, routineBlocks, updateRecord])

  const markPresence = useCallback(() => {
    if (!hasRoutine || routineBlocks.length === 0) return

    updateRecord((prev) => {
      if (prev.status === "completed" || prev.status === "canceled") return prev

      return {
        ...prev,
        presenceAt: prev.presenceAt ?? nowIso(),
        status: "in-progress",
      }
    })
  }, [hasRoutine, routineBlocks.length, updateRecord])

  const startStudy = useCallback(() => {
    if (!hasRoutine || routineBlocks.length === 0) return

    const startedAt = nowIso()
    updateRecord((prev) => {
      if (prev.status === "completed" || prev.status === "canceled") return prev

      const next: DailyStudyRecord = {
        ...prev,
        presenceAt: prev.presenceAt ?? startedAt,
        studyStartedAt: prev.studyStartedAt ?? startedAt,
        activeSegmentStartedAt: null,
        routineBreakSegmentStartedAt: null,
        awaitingNextBlock: false,
        status: "in-progress",
      }

      return startCurrentRoutineSegment(next, routineBlocks, startedAt)
    })
  }, [hasRoutine, routineBlocks, updateRecord])

  const pauseStudy = useCallback(() => {
    if (!hasRoutine || routineBlocks.length === 0) return

    const now = Date.now()
    updateRecord((prev) => {
      if (prev.status !== "in-progress") return prev

      let next = finalizeCurrentRoutineSegment(prev, routineBlocks, now)
      next = {
        ...next,
        pauses: [
          ...next.pauses,
          { startedAt: new Date(now).toISOString(), endedAt: null, durationSeconds: 0 },
        ],
      }
      return next
    })
  }, [hasRoutine, routineBlocks, updateRecord])

  const resumeStudy = useCallback(() => {
    if (!hasRoutine || routineBlocks.length === 0) return

    const now = Date.now()
    updateRecord((prev) => {
      if (prev.status !== "in-progress") return prev

      let next = finalizeOpenPause(prev, now)
      next = {
        ...next,
        activeSegmentStartedAt: null,
        routineBreakSegmentStartedAt: null,
        status: "in-progress",
      }
      return startCurrentRoutineSegment(next, routineBlocks, new Date(now).toISOString())
    })
  }, [hasRoutine, routineBlocks, updateRecord])

  const completeStudy = useCallback(() => {
    const now = Date.now()
    updateRecord((prev) => {
      let next = finalizeOpenPause(prev, now)
      next = finalizeCurrentRoutineSegment(next, routineBlocks, now)

      const bonusSeconds = getCountableBonusSeconds(next.activeSeconds, goalSeconds)

      return {
        ...next,
        bonusSeconds,
        status: "completed",
        completedAt: new Date(now).toISOString(),
        activeSegmentStartedAt: null,
        routineBreakSegmentStartedAt: null,
        awaitingNextBlock: false,
      }
    })
  }, [updateRecord, routineBlocks, goalSeconds])

  const cancelDay = useCallback(() => {
    updateRecord((prev) => {
      const now = Date.now()
      let next = finalizeOpenPause(prev, now)
      next = finalizeCurrentRoutineSegment(next, routineBlocks, now)
      const activeSeconds = next.activeSeconds
      const bonusSeconds = getCountableBonusSeconds(activeSeconds, goalSeconds)

      return {
        ...next,
        bonusSeconds,
        status: "canceled",
        canceledAt: new Date(now).toISOString(),
        completedAt: null,
        activeSegmentStartedAt: null,
        routineBreakSegmentStartedAt: null,
        awaitingNextBlock: false,
      }
    })
  }, [updateRecord, routineBlocks, goalSeconds])

  const resumeCanceledDay = useCallback(() => {
    if (!hasRoutine || routineBlocks.length === 0) return

    const now = Date.now()
    const resumedAt = new Date(now).toISOString()
    updateRecord((prev) => {
      if (prev.status !== "canceled") return prev

      const next: DailyStudyRecord = {
        ...prev,
        status: "in-progress",
        resumedAt,
        completedAt: null,
        activeSegmentStartedAt: null,
        routineBreakSegmentStartedAt: null,
      }

      if (!next.studyStartedAt) return next

      const block = getCurrentRoutineBlock(next, routineBlocks)
      const durationSeconds = getRoutineBlockDurationSeconds(block)
      if (block && next.routineBlockElapsedSeconds >= durationSeconds) {
        return { ...next, awaitingNextBlock: true }
      }

      return startCurrentRoutineSegment({ ...next, awaitingNextBlock: false }, routineBlocks, resumedAt)
    })
  }, [hasRoutine, routineBlocks, updateRecord])

  const advanceRoutineBlock = useCallback(() => {
    if (!hasRoutine || routineBlocks.length === 0) return

    const now = Date.now()
    updateRecord((prev) => {
      if (prev.status !== "in-progress" || !prev.studyStartedAt) return prev

      const next = prev.awaitingNextBlock
        ? {
            ...prev,
            activeSegmentStartedAt: null,
            routineBreakSegmentStartedAt: null,
          }
        : completeCurrentRoutineBlock(prev, routineBlocks, now)

      return advanceToNextRoutineBlock(next, routineBlocks, now)
    })
  }, [hasRoutine, routineBlocks, updateRecord])

  const resetDay = useCallback(() => {
    const empty = createEmptyRecord(dateKey)
    persist(empty)
    setRecord(empty)
  }, [dateKey])

  const currentBlock = record ? getCurrentRoutineBlock(record, routineBlocks) : null
  const currentBlockElapsedSeconds =
    record && currentBlock ? computeLiveRoutineBlockElapsedSeconds(record, currentBlock, nowMs) : 0
  const activeSeconds =
    record && currentBlock && record.activeSegmentStartedAt
      ? record.activeSeconds +
        Math.max(0, currentBlockElapsedSeconds - record.routineBlockElapsedSeconds)
      : record
        ? computeLiveActiveSeconds(record, nowMs)
        : 0
  const pauseSeconds = record ? computeLivePauseSeconds(record, nowMs) : 0
  const routineBreakSeconds =
    record && currentBlock && record.routineBreakSegmentStartedAt
      ? record.routineBreakSeconds +
        Math.max(0, currentBlockElapsedSeconds - record.routineBlockElapsedSeconds)
      : record
        ? computeLiveRoutineBreakSeconds(record, nowMs)
        : 0
  const controlState = deriveControlState(record)
  const metaReached = activeSeconds >= goalSeconds
  const bonusSeconds = getCountableBonusSeconds(activeSeconds, goalSeconds)
  const progress = Math.min(100, goalSeconds > 0 ? (activeSeconds / goalSeconds) * 100 : 0)
  const currentBlockDurationSeconds = getRoutineBlockDurationSeconds(currentBlock)
  const currentBlockProgress = Math.min(
    100,
    currentBlockDurationSeconds > 0
      ? (currentBlockElapsedSeconds / currentBlockDurationSeconds) * 100
      : 0,
  )
  const hasNextBlock = record ? hasNextRoutineBlock(record, routineBlocks) : false
  const nextBlock =
    record && hasNextBlock ? routineBlocks[record.routineBlockIndex + 1] ?? null : null
  const isCurrentBlockRoutineBreak = currentBlock ? isRoutineBreakBlock(currentBlock.type) : false

  return {
    record,
    settings,
    controlState,
    activeSeconds,
    pauseSeconds,
    routineBreakSeconds,
    bonusSeconds,
    goalSeconds,
    metaReached,
    progress,
    hydrated: hydrated && settingsHydrated,
    currentBlock,
    currentBlockIndex: record?.routineBlockIndex ?? -1,
    currentBlockElapsedSeconds,
    currentBlockDurationSeconds,
    currentBlockProgress,
    nextBlock,
    hasNextBlock,
    isCurrentBlockRoutineBreak,
    markPresence,
    startStudy,
    pauseStudy,
    resumeStudy,
    completeStudy,
    cancelDay,
    resumeCanceledDay,
    advanceRoutineBlock,
    resetDay,
  }
}
