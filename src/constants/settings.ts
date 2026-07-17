import type {
  RoutineMode,
  SoundEventKey,
  SoundPreferences,
  StudySettings,
} from "@/types/study"

export const SOUND_EVENT_OPTIONS: {
  key: SoundEventKey
  label: string
  description: string
}[] = [
  {
    key: "shortBreak",
    label: "Som de pausa curta",
    description: "Toca ao iniciar uma pausa curta.",
  },
  {
    key: "longBreak",
    label: "Som de pausa longa",
    description: "Toca ao iniciar uma pausa longa.",
  },
  {
    key: "lunch",
    label: "Som de almoço",
    description: "Toca ao iniciar o almoço.",
  },
  {
    key: "subjectChange",
    label: "Som de troca de matéria",
    description: "Toca ao mudar para uma nova tarefa.",
  },
]

export const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  shortBreak: { audioId: "default", startSeconds: 0, endSeconds: null },
  longBreak: { audioId: "default", startSeconds: 0, endSeconds: null },
  lunch: { audioId: "default", startSeconds: 0, endSeconds: null },
  subjectChange: { audioId: "default", startSeconds: 0, endSeconds: null },
}

export const MAX_CUSTOM_SOUND_SIZE_BYTES = 5 * 1024 * 1024
export const LONG_AUDIO_THRESHOLD_SECONDS = 10

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
  customSounds: [],
  soundPreferences: DEFAULT_SOUND_PREFERENCES,
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
