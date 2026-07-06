"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { STORAGE_EVENTS, STORAGE_KEYS } from "@/constants/storage"
import type { Theme } from "@/types/theme"

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(): Theme {
  const stored = window.localStorage.getItem(STORAGE_KEYS.theme)
  return stored === "dark" || stored === "light" ? stored : getSystemTheme()
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")

  useEffect(() => {
    setThemeState(getStoredTheme())

    const refreshTheme = () => setThemeState(getStoredTheme())
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEYS.theme) {
        refreshTheme()
      }
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener(STORAGE_EVENTS.themeChanged, refreshTheme)
    window.addEventListener(STORAGE_EVENTS.appDataChanged, refreshTheme)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener(STORAGE_EVENTS.themeChanged, refreshTheme)
      window.removeEventListener(STORAGE_EVENTS.appDataChanged, refreshTheme)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    window.localStorage.setItem(STORAGE_KEYS.theme, theme)
  }, [theme])

  const setTheme = (next: Theme) => setThemeState(next)
  const toggleTheme = () => setThemeState((t) => (t === "dark" ? "light" : "dark"))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider")
  return ctx
}
