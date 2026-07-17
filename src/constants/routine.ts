import type {
  BlockTypeMeta,
  Routine,
  RoutineBlockType,
  RoutineDay,
  Subject,
  WeekDay,
  Weekday,
} from "@/types/study"

const DEFAULT_TIMESTAMP = "2026-01-01T00:00:00.000Z"

export const WEEK_DAYS: WeekDay[] = [
  { key: "sunday", label: "Domingo", short: "Dom" },
  { key: "monday", label: "Segunda", short: "Seg" },
  { key: "tuesday", label: "Terça", short: "Ter" },
  { key: "wednesday", label: "Quarta", short: "Qua" },
  { key: "thursday", label: "Quinta", short: "Qui" },
  { key: "friday", label: "Sexta", short: "Sex" },
  { key: "saturday", label: "Sábado", short: "Sáb" },
]

export const ALL_WEEK_DAYS: WeekDay[] = WEEK_DAYS

export const WEEKDAY_BY_DATE_INDEX: Record<number, Weekday> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
}

export const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: "linux",
    name: "Linux",
    category: "Tecnologia",
    color: "chart-1",
    isActive: true,
  },
  {
    id: "react",
    name: "React",
    category: "Tecnologia",
    color: "chart-1",
    isActive: true,
  },
  {
    id: "ingles",
    name: "Inglês",
    category: "Idioma",
    color: "chart-1",
    isActive: true,
  },
  {
    id: "oracle-sql",
    name: "Oracle SQL",
    category: "Banco de dados",
    color: "chart-1",
    isActive: true,
  },
  {
    id: "algoritmos",
    name: "Algoritmos",
    category: "Fundamentos",
    color: "chart-1",
    isActive: true,
  },
  {
    id: "projeto-escola",
    name: "Projeto Escola",
    category: "Projeto",
    color: "chart-5",
    isActive: true,
  },
]

export const BLOCK_TYPE_META: Record<RoutineBlockType, BlockTypeMeta> = {
  study: {
    label: "Estudo",
    dot: "bg-chart-1",
    badge: "bg-chart-1/15 text-chart-1 border-chart-1/25",
  },
  "short-break": {
    label: "Pausa curta",
    dot: "bg-chart-2",
    badge: "bg-chart-2/15 text-chart-2 border-chart-2/25",
  },
  "long-break": {
    label: "Pausa longa",
    dot: "bg-chart-3",
    badge: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  },
  lunch: {
    label: "Almoço",
    dot: "bg-chart-4",
    badge: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  },
  project: {
    label: "Projeto",
    dot: "bg-chart-5",
    badge: "bg-chart-5/15 text-chart-5 border-chart-5/25",
  },
  other: {
    label: "Outro",
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
  },
}

function createEmptyRoutineDay(weekday: Weekday): RoutineDay {
  return {
    id: `empty-${weekday}`,
    weekday,
    blocks: [],
    isActive: false,
  }
}

export const LEGACY_DEFAULT_ROUTINE_ID = "default-study-routine"

export const DEFAULT_ROUTINE: Routine = {
  id: "empty-study-routine",
  name: "Minha rotina",
  mode: "no-work",
  days: WEEK_DAYS.map((day) => createEmptyRoutineDay(day.key)),
  createdAt: DEFAULT_TIMESTAMP,
  updatedAt: DEFAULT_TIMESTAMP,
}
