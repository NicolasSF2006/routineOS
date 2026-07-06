export const STORAGE_KEYS = {
  settings: "study-app-settings",
  records: "study-app-records",
  routine: "routineos-active-routine",
  view: "routineos-current-view",
} as const

export const STORAGE_EVENTS = {
  recordsChanged: "study-records-changed",
  routineChanged: "routineos-routine-changed",
} as const
