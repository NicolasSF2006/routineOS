import { calculateDurationMinutes } from "@/utils/time"
import type {
  BlockTypeMeta,
  Routine,
  RoutineBlock,
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
  { id: "linux", name: "Linux", category: "Tecnologia", color: "chart-1", isActive: true },
  { id: "react", name: "React", category: "Tecnologia", color: "chart-1", isActive: true },
  { id: "ingles", name: "Inglês", category: "Idioma", color: "chart-1", isActive: true },
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
}

const DEFAULT_ROUTINE_BLOCK_TEMPLATES: Omit<RoutineBlock, "id">[] = [
  {
    type: "study",
    subjectId: "linux",
    title: "Linux",
    startTime: "10:30",
    endTime: "11:20",
    durationMinutes: calculateDurationMinutes("10:30", "11:20"),
    order: 1,
  },
  {
    type: "short-break",
    title: "Pausa curta",
    startTime: "11:20",
    endTime: "11:25",
    durationMinutes: calculateDurationMinutes("11:20", "11:25"),
    order: 2,
  },
  {
    type: "study",
    subjectId: "react",
    title: "React",
    startTime: "11:25",
    endTime: "12:15",
    durationMinutes: calculateDurationMinutes("11:25", "12:15"),
    order: 3,
  },
  {
    type: "long-break",
    title: "Pausa longa",
    startTime: "12:15",
    endTime: "12:30",
    durationMinutes: calculateDurationMinutes("12:15", "12:30"),
    order: 4,
  },
  {
    type: "study",
    subjectId: "ingles",
    title: "Inglês",
    startTime: "12:30",
    endTime: "13:20",
    durationMinutes: calculateDurationMinutes("12:30", "13:20"),
    order: 5,
  },
  {
    type: "lunch",
    title: "Almoço",
    startTime: "13:20",
    endTime: "14:20",
    durationMinutes: calculateDurationMinutes("13:20", "14:20"),
    order: 6,
  },
  {
    type: "study",
    subjectId: "oracle-sql",
    title: "Oracle SQL",
    startTime: "14:20",
    endTime: "15:10",
    durationMinutes: calculateDurationMinutes("14:20", "15:10"),
    order: 7,
  },
  {
    type: "short-break",
    title: "Pausa curta",
    startTime: "15:10",
    endTime: "15:15",
    durationMinutes: calculateDurationMinutes("15:10", "15:15"),
    order: 8,
  },
  {
    type: "study",
    subjectId: "algoritmos",
    title: "Algoritmos",
    startTime: "15:15",
    endTime: "16:05",
    durationMinutes: calculateDurationMinutes("15:15", "16:05"),
    order: 9,
  },
  {
    type: "long-break",
    title: "Pausa longa",
    startTime: "16:05",
    endTime: "16:20",
    durationMinutes: calculateDurationMinutes("16:05", "16:20"),
    order: 10,
  },
  {
    type: "project",
    subjectId: "projeto-escola",
    title: "Projeto Escola",
    startTime: "16:20",
    endTime: "17:40",
    durationMinutes: calculateDurationMinutes("16:20", "17:40"),
    order: 11,
  },
]

function createDefaultRoutineBlocks(weekday: Weekday): RoutineBlock[] {
  return DEFAULT_ROUTINE_BLOCK_TEMPLATES.map((block) => ({
    ...block,
    id: `${weekday}-${block.order}`,
  }))
}

function createDefaultRoutineDay(weekday: Weekday, isActive: boolean): RoutineDay {
  return {
    id: `default-${weekday}`,
    weekday,
    blocks: isActive ? createDefaultRoutineBlocks(weekday) : [],
    isActive,
  }
}

export const DEFAULT_ROUTINE: Routine = {
  id: "default-study-routine",
  name: "Rotina padrão de estudos",
  mode: "no-work",
  days: [
    createDefaultRoutineDay("monday", true),
    createDefaultRoutineDay("tuesday", true),
    createDefaultRoutineDay("wednesday", true),
    createDefaultRoutineDay("thursday", true),
    createDefaultRoutineDay("friday", true),
    createDefaultRoutineDay("saturday", false),
    createDefaultRoutineDay("sunday", false),
  ],
  createdAt: DEFAULT_TIMESTAMP,
  updatedAt: DEFAULT_TIMESTAMP,
}
