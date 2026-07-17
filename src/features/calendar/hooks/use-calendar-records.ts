"use client"

import { useEffect, useState } from "react"
import { STORAGE_EVENTS } from "@/constants/storage"
import { loadAllRecords } from "@/lib/storage"

export function useCalendarRecords() {
  const [records, setRecords] = useState(loadAllRecords)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const refresh = () => setRecords(loadAllRecords())

    refresh()
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    window.addEventListener("storage", refresh)
    window.addEventListener(STORAGE_EVENTS.recordsChanged, refresh)

    return () => {
      clearInterval(id)
      window.removeEventListener("storage", refresh)
      window.removeEventListener(STORAGE_EVENTS.recordsChanged, refresh)
    }
  }, [])

  return { records, nowMs }
}
