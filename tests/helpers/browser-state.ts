import type { Page } from "@playwright/test"
import type { Routine, Weekday } from "@/types/study"

export const FIXED_TIME = new Date("2026-07-14T10:00:00-03:00")

export const filledRoutine: Routine = {
  id: "routine-e2e",
  name: "Rotina E2E",
  mode: "no-work",
  days: [
    {
      id: "tuesday",
      weekday: "tuesday",
      isActive: true,
      blocks: [
        {
          id: "typescript",
          type: "study",
          title: "TypeScript",
          description: "Revisar tipos discriminados",
          startTime: "10:00",
          endTime: "10:50",
          durationMinutes: 50,
          order: 1,
        },
        {
          id: "break",
          type: "short-break",
          title: "Pausa",
          startTime: "10:50",
          endTime: "10:55",
          durationMinutes: 5,
          order: 2,
        },
      ],
    },
    ...(
      [
        "monday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ] satisfies Weekday[]
    ).map((weekday) => ({ id: weekday, weekday, isActive: false, blocks: [] })),
  ],
  weeks: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

export const conflictingRoutine: Routine = {
  ...filledRoutine,
  days: filledRoutine.days.map((day) =>
    day.weekday === "tuesday"
      ? {
          ...day,
          blocks: [
            ...day.blocks,
            {
              id: "conflict",
              type: "project",
              title: "Projeto sobreposto",
              startTime: "10:30",
              endTime: "11:20",
              durationMinutes: 50,
              order: 3,
            },
          ],
        }
      : day,
  ),
}

export async function preparePage(
  page: Page,
  options: {
    routine?: Routine
    view?: string
    onboarding?: boolean
  } = {},
): Promise<void> {
  await page.clock.setFixedTime(FIXED_TIME)
  await page.addInitScript((state) => {
    localStorage.clear()
    if (state.onboarding !== false) {
      localStorage.setItem("routineos-onboarding-completed", "true")
    }
    if (state.routine) {
      localStorage.setItem(
        "routineos-active-routine",
        JSON.stringify(state.routine),
      )
    }
    if (state.view) localStorage.setItem("routineos-current-view", state.view)
  }, options)
}

export async function disableVisualMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}
