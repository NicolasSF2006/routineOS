import { DEFAULT_ROUTINE } from "@/constants/routine"
import type { Routine, RoutineBlock, RoutineDay, Weekday } from "@/types/study"

export function createRoutineBlock(
  overrides: Partial<RoutineBlock> = {},
): RoutineBlock {
  return {
    id: "bloco-1",
    type: "study",
    title: "TypeScript",
    description: "Revisar tipos discriminados",
    startTime: "19:00",
    endTime: "19:50",
    durationMinutes: 50,
    order: 1,
    ...overrides,
  }
}

export function createRoutineDay(
  weekday: Weekday,
  blocks: RoutineBlock[] = [],
): RoutineDay {
  return {
    id: `dia-${weekday}`,
    weekday,
    blocks,
    isActive: blocks.length > 0,
  }
}

export function createRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    ...DEFAULT_ROUTINE,
    id: "rotina-teste",
    name: "Rotina de teste",
    days: DEFAULT_ROUTINE.days.map((day) => ({ ...day, blocks: [] })),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}
