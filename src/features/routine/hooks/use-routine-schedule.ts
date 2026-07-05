"use client"

import { useEffect, useState } from "react"
import {
  getCurrentRoutineBlockIndex,
  getDefaultWeekdayKey,
} from "@/features/routine/utils/routine-schedule"
import { getRoutineDayBlocks } from "@/features/routine/utils/routine-domain"
import { useRoutine } from "@/features/routine/hooks/use-routine"
import type { Weekday } from "@/types/study"

export function useRoutineSchedule() {
  const { routine, isLoading } = useRoutine()
  const [nowMinutes, setNowMinutes] = useState<number | null>(null)
  const [activeDay, setActiveDay] = useState<Weekday>(() => getDefaultWeekdayKey(new Date()))

  useEffect(() => {
    const update = () => {
      const date = new Date()
      setNowMinutes(date.getHours() * 60 + date.getMinutes())
    }

    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  const activeBlocks = getRoutineDayBlocks(routine, activeDay)

  return {
    routine,
    isLoading,
    activeDay,
    setActiveDay,
    activeBlocks,
    currentBlockIndex: getCurrentRoutineBlockIndex(nowMinutes, activeBlocks),
  }
}
