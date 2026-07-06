export const STORAGE_KEYS = {
  settings: "study-app-settings",
  records: "study-app-records",
  routine: "routineos-active-routine",
  view: "routineos-current-view",
  theme: "routine-theme",
} as const

export const STORAGE_EVENTS = {
  settingsChanged: "routineos-settings-changed",
  recordsChanged: "study-records-changed",
  routineChanged: "routineos-routine-changed",
  themeChanged: "routineos-theme-changed",
  appDataChanged: "routineos-app-data-changed",
} as const

export const BACKUP_SCHEMA_VERSION = 1
