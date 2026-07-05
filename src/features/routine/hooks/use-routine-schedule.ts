"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getCurrentWeekDays,
  getCurrentRoutineBlockIndex,
} from "@/features/routine/utils/routine-schedule"
import { getRoutineDayBlocks, getWeekdayFromDateKey } from "@/features/routine/utils/routine-domain"
import { useRoutine } from "@/features/routine/hooks/use-routine"
import { getTodayDateKey, parseDateKey, toDateKey } from "@/utils/date"

export function useRoutineSchedule() {
  const { routine, isLoading } = useRoutine()
  const [nowMinutes, setNowMinutes] = useState<number | null>(null)
  const [activeDateKey, setActiveDateKey] = useState(() => getTodayDateKey())
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    const update = () => {
      const date = new Date()
      setNowMinutes(date.getHours() * 60 + date.getMinutes())
    }

    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  const currentWeekDays = useMemo(() => {
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() + weekOffset * 7)
    return getCurrentWeekDays(baseDate)
  }, [weekOffset])

  const moveSelectedWeek = useCallback((direction: -1 | 1) => {
    setWeekOffset((current) => current + direction)
    setActiveDateKey((currentDateKey) => {
      const nextDate = parseDateKey(currentDateKey)
      nextDate.setDate(nextDate.getDate() + direction * 7)
      return toDateKey(nextDate)
    })
  }, [])

  const goToPreviousWeek = useCallback(() => {
    moveSelectedWeek(-1)
  }, [moveSelectedWeek])

  const goToNextWeek = useCallback(() => {
    moveSelectedWeek(1)
  }, [moveSelectedWeek])

  const goToCurrentWeek = useCallback(() => {
    setWeekOffset(0)
    setActiveDateKey(getTodayDateKey())
  }, [])

  const activeDay = getWeekdayFromDateKey(activeDateKey)
  const activeDate = parseDateKey(activeDateKey)
  const activeBlocks = getRoutineDayBlocks(routine, activeDay)
  const isSelectedToday = activeDateKey === getTodayDateKey()

  return {
    routine,
    isLoading,
    activeDateKey,
    setActiveDateKey,
    activeDay,
    activeDate,
    currentWeekDays,
    weekOffset,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    activeBlocks,
    currentBlockIndex: isSelectedToday ? getCurrentRoutineBlockIndex(nowMinutes, activeBlocks) : -1,
  }
}
