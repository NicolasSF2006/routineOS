import type { RoutineMode, StudySettings } from "@/types/study"

export const DEFAULT_SETTINGS: StudySettings = {
  soundsEnabled: true,
  soundShortBreak: true,
  soundLongBreak: true,
  soundLunch: true,
  soundSubjectChange: false,
  routineMode: "no-work",
  dailyGoalHours: 6,
  monthlyGoalHours: 120,
  latenessToleranceMinutes: 10,
}

export const ROUTINE_MODE_OPTIONS: {
  value: RoutineMode
  label: string
  desc: string
  soon?: boolean
}[] = [
  { value: "no-work", label: "Sem trabalho", desc: "Foco total nos estudos" },
  {
    value: "working",
    label: "Trabalhando",
    desc: "Rotina ajustada ao expediente",
    soon: true,
  },
  { value: "vacation", label: "Férias", desc: "Ritmo mais leve" },
]
