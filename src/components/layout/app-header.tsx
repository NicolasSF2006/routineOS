"use client"

import { useState } from "react"
import Image from "next/image"
import { Bot, Menu } from "lucide-react"
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
import { cn } from "@/lib/utils"
import type { ViewKey } from "@/types/navigation"

export function AppHeader({
  activeView,
  onNavigate,
  onOpenMentor,
}: {
  activeView: ViewKey
  onNavigate: (view: ViewKey) => void
  onOpenMentor: () => void
}) {
  const [open, setOpen] = useState(false)

  const handleNavigate = (view: ViewKey) => {
    onNavigate(view)
    setOpen(false)
  }

  const handleOpenMentor = () => {
    setOpen(false)
    onOpenMentor()
  }

  return (
    <header className="border-border/80 bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex w-16 items-center gap-2 sm:w-20 lg:w-auto lg:shrink-0">
          <button
            type="button"
            onClick={() => onNavigate("rotina")}
            className="border-primary/20 bg-primary/5 hover:bg-primary/10 focus-visible:ring-ring flex size-10 cursor-pointer items-center justify-center rounded-xl border transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Ir para a rotina"
          >
            <Image
              src="/logo-routineos.png"
              alt=""
              width={32}
              height={32}
              priority
              aria-hidden="true"
              className="size-8 object-contain"
            />
          </button>
          <h1 className="text-foreground hidden text-xl leading-tight font-semibold lg:block">
            RoutineOS
          </h1>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center px-3 lg:hidden">
          <h1 className="text-foreground truncate text-xl leading-tight font-semibold">
            RoutineOS
          </h1>
        </div>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-end gap-1 lg:flex"
          aria-label="Navegação principal"
        >
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
                  "focus-visible:ring-ring inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="flex w-16 items-center justify-end gap-1 sm:w-20 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Abrir menu"
                  className="rounded-xl"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(20rem,calc(100vw-1rem))] p-0"
            >
              <SheetHeader className="border-border border-b px-5 py-4 text-left">
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
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                        <span className="text-muted-foreground text-sm wrap-break-word">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  )
                })}

                <div className="bg-border my-1 h-px" aria-hidden="true" />

                <button
                  type="button"
                  onClick={handleOpenMentor}
                  className="text-foreground hover:bg-muted focus-visible:ring-ring flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
                    <Bot className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">Mentor IA</span>
                    <span className="text-muted-foreground text-sm wrap-break-word">
                      Abra o assistente de estudos
                    </span>
                  </span>
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
