import type {
  MentorContext,
  MentorRoutineProposal,
} from "@/features/mentor/types"

export const mentorRoutineProposal: MentorRoutineProposal = {
  name: "Rotina de tecnologia",
  method: "pomodoro",
  summary: "Estudos noturnos com pausas regulares.",
  pomodoro: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakAfterFocusBlocks: 2,
  },
  schedules: [
    {
      weekdays: ["monday", "wednesday", "friday"],
      availabilityStartTime: "19:00",
      availabilityEndTime: "21:00",
      blocks: [
        {
          type: "study",
          title: "Fundamentos de TypeScript",
          startTime: "19:00",
          durationMinutes: 25,
        },
        {
          type: "study",
          title: "Tipos discriminados",
          startTime: "19:30",
          durationMinutes: 25,
        },
        {
          type: "project",
          title: "Projeto prático em TypeScript",
          startTime: "20:10",
          durationMinutes: 25,
        },
      ],
    },
  ],
}

export function createMentorContext(): MentorContext {
  const monday = {
    dateKey: "2026-07-13",
    weekday: "monday" as const,
    weekdayLabel: "Segunda",
    hasRoutine: true,
    plannedMinutes: 100,
    blocks: [
      {
        title: "TypeScript",
        type: "study" as const,
        startTime: "19:00",
        endTime: "19:50",
        durationMinutes: 50,
      },
      {
        title: "TypeScript",
        type: "study" as const,
        startTime: "20:00",
        endTime: "20:50",
        durationMinutes: 50,
      },
    ],
  }

  return {
    currentView: "rotina",
    today: "2026-07-13",
    activeRoutine: {
      name: "Rotina de teste",
      mode: "no-work",
      hasCustomRoutine: true,
    },
    todayRoutine: monday,
    weekRoutine: [monday],
    monthSummary: {
      completedDays: 0,
      canceledDays: 0,
      missedDays: 0,
      studiedMinutes: 0,
      remainingMinutes: 1200,
      bonusMinutes: 0,
      dailyGoalMinutes: 120,
      monthlyGoalMinutes: 1200,
    },
    monthHistory: [],
    monthRoutine: {
      year: 2026,
      month: 6,
      daysAnalyzed: 31,
      studyBlockCount: 2,
      topics: [
        {
          id: "typescript",
          title: "TypeScript",
          sourceBlocks: ["TypeScript"],
          days: ["2026-07-13"],
          occurrenceCount: 2,
          totalMinutes: 100,
        },
      ],
    },
    studyTrail: { hasTrail: false, title: null, routineName: null, topics: [] },
    settings: {
      routineMode: "no-work",
      dailyGoalHours: 2,
      monthlyGoalHours: 20,
      latenessToleranceMinutes: 10,
      soundsEnabled: true,
      hasCustomSounds: false,
    },
    theme: "light",
    onboardingCompleted: true,
  }
}
