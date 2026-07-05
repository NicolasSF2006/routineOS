"use client"

import { useState } from "react"
import { GraduationCap, Menu, Moon, Sun } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { NAV_ITEMS } from "@/constants/navigation"
import { useTheme } from "@/components/providers/theme-provider"
import { cn } from "@/lib/utils"
import type { ViewKey } from "@/types/navigation"

export function AppHeader({
  activeView,
  onNavigate,
}: {
  activeView: ViewKey
  onNavigate: (view: ViewKey) => void
}) {
  const [open, setOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const handleNavigate = (view: ViewKey) => {
    onNavigate(view)
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex w-20 items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" aria-hidden="true" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-center">
          <h1 className="text-base font-semibold leading-tight text-foreground sm:text-lg">
            RoutineOS
          </h1>
          <span className="max-w-[13rem] text-center text-[11px] font-medium leading-tight text-muted-foreground sm:max-w-none sm:text-xs">
            The operating system for your personal growth.
          </span>
        </div>

        <div className="flex w-20 items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            className="rounded-xl"
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Abrir menu" className="rounded-xl" />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-5 py-4 text-left">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Navegue entre as telas</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-3">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const isActive = item.key === activeView
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleNavigate(item.key)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-lg",
                          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </span>
                    </button>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
