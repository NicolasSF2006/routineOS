export const STORAGE_KEYS = {
  settings: "study-app-settings",
  records: "study-app-records",
  routine: "routineos-active-routine",
  view: "routineos-current-view",
  theme: "routine-theme",
  onboardingCompleted: "routineos-onboarding-completed",
  mentorChat: "routineos-mentor-chat",
  mentorTrails: "routineos-mentor-trails",
  mentorRoutineDraft: "routineos-mentor-routine-draft",
} as const

export const STORAGE_EVENTS = {
  settingsChanged: "routineos-settings-changed",
  recordsChanged: "study-records-changed",
  routineChanged: "routineos-routine-changed",
  themeChanged: "routineos-theme-changed",
  appDataChanged: "routineos-app-data-changed",
  mentorChatChanged: "routineos-mentor-chat-changed",
  mentorTrailsChanged: "routineos-mentor-trails-changed",
  mentorRoutineDraftChanged: "routineos-mentor-routine-draft-changed",
} as const

export const BACKUP_SCHEMA_VERSION = 4
