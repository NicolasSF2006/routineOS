"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OnboardingDialogProps {
  open: boolean
  onComplete: () => void
}

const ONBOARDING_STEPS = [
  {
    title: "Bem-vindo ao RoutineOS",
    description:
      "Organize sua rotina de estudos, acompanhe seu progresso e mantenha tudo salvo no navegador.",
    icon: Sparkles,
  },
  {
    title: "Crie sua rotina",
    description:
      "Vá em Configurações e abra Configurar rotina para montar sua semana com tarefas, pausas, almoço, projetos e outros blocos.",
    icon: Settings2,
  },
  {
    title: "Acompanhe seus estudos",
    description:
      "Na tela Rotina, marque presença, inicie seus estudos, pause, conclua tarefas e acompanhe o tempo estudado.",
    icon: ListChecks,
  },
  {
    title: "Veja seu progresso",
    description:
      "No Calendário, acompanhe dias com rotina prevista, dias concluídos, dias cancelados e o histórico do mês.",
    icon: CalendarDays,
  },
  {
    title: "Proteja seus dados",
    description:
      "Em Configurações, exporte backup, importe backup ou resete os dados quando precisar.",
    icon: ShieldCheck,
  },
] as const

export function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const currentStep = ONBOARDING_STEPS[stepIndex]
  const Icon = currentStep.icon
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1
  const dialogRef = useRef<HTMLElement | null>(null)

  const progressLabel = useMemo(
    () => `Passo ${stepIndex + 1} de ${ONBOARDING_STEPS.length}`,
    [stepIndex],
  )

  useEffect(() => {
    if (open) {
      setStepIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onComplete()
        return
      }

      if (event.key !== "Tab" || !dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [onComplete, open])

  if (!open) return null

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
      return
    }

    setStepIndex((current) =>
      Math.min(current + 1, ONBOARDING_STEPS.length - 1),
    )
  }

  const handlePrevious = () => {
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <section
        ref={dialogRef}
        className="border-border bg-background flex max-h-[calc(100svh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
      >
        <div className="border-border flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-primary text-sm font-medium">
              Primeiros passos
            </span>
            <span className="text-muted-foreground text-sm">
              {progressLabel}
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="shrink-0"
            onClick={onComplete}
          >
            Pular tutorial
          </Button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="bg-primary/10 text-primary mb-5 flex size-16 items-center justify-center rounded-2xl sm:size-20">
              <Icon className="size-8 sm:size-10" />
            </div>

            <h2
              id="onboarding-title"
              className="text-foreground text-2xl font-semibold"
            >
              {currentStep.title}
            </h2>
            <p
              id="onboarding-description"
              className="text-muted-foreground mt-3 text-base leading-7 wrap-break-word"
            >
              {currentStep.description}
            </p>

            <div className="mt-7 grid w-full gap-3 sm:grid-cols-5">
              {ONBOARDING_STEPS.map((step, index) => {
                const StepIcon = step.icon

                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setStepIndex(index)}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-2 text-sm transition-colors",
                      index === stepIndex
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    aria-label={`Ir para ${step.title}`}
                    aria-current={index === stepIndex ? "step" : undefined}
                  >
                    <StepIcon className="size-4" />
                    <span>{index + 1}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="border-border bg-muted/20 flex flex-col-reverse gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="mr-2 size-4" />
            Voltar
          </Button>

          <Button type="button" onClick={handleNext}>
            {isLastStep ? "Começar a usar" : "Próximo"}
            {!isLastStep ? <ChevronRight className="ml-2 size-4" /> : null}
          </Button>
        </div>
      </section>
    </div>
  )
}
