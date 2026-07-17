import {
  dateKeyFromParts,
  formatClock,
  formatDuration,
  formatHours,
  formatTime,
  getCurrentMonthMeta,
  getMonthLabel,
  getTodayDateKey,
  isWeekday,
  isWeekend,
  nowIso,
  parseDateKey,
  toDateKey,
} from "@/utils/date"
import { calculateDurationMinutes, timeToMinutes } from "@/utils/time"

describe("datas e horários", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 14, 30, 0))
  })

  afterEach(() => vi.useRealTimers())

  it("converte chaves locais de data sem depender de UTC", () => {
    expect(getTodayDateKey()).toBe("2026-07-15")
    expect(toDateKey(new Date(2026, 0, 2))).toBe("2026-01-02")
    expect(parseDateKey("2026-07-15")).toEqual(new Date(2026, 6, 15))
    expect(dateKeyFromParts(2026, 6, 5)).toBe("2026-07-05")
    expect(getCurrentMonthMeta()).toEqual({ year: 2026, month: 6 })
    expect(nowIso()).toBe(new Date(2026, 6, 15, 14, 30, 0).toISOString())
  })

  it("classifica dias e formata mês", () => {
    expect(isWeekend("2026-07-18")).toBe(true)
    expect(isWeekday("2026-07-15")).toBe(true)
    expect(getMonthLabel(2026, 6)).toBe("Julho 2026")
  })

  it("formata duração, relógio, horas e horário opcional", () => {
    expect(formatDuration(-1)).toBe("0min")
    expect(formatDuration(45)).toBe("45s")
    expect(formatDuration(90)).toBe("1min")
    expect(formatDuration(3_900)).toBe("1h 05min")
    expect(formatClock(3_661)).toBe("01:01:01")
    expect(formatHours(7_200)).toBe("2h")
    expect(formatHours(5_400)).toBe("1.5h")
    expect(formatTime(null)).toBe("—")
    expect(formatTime("2026-07-15T13:05:00.000Z")).toMatch(/\d{2}:\d{2}/)
  })

  it("converte horários em minutos e impede duração negativa", () => {
    expect(timeToMinutes("19:30")).toBe(1_170)
    expect(calculateDurationMinutes("19:00", "20:15")).toBe(75)
    expect(calculateDurationMinutes("20:00", "19:00")).toBe(0)
  })
})
