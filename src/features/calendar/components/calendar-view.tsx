"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { PageHeading } from "@/components/shared/page-heading"
import { CalendarGrid } from "@/features/calendar/components/calendar-grid"
import { CalendarLegend } from "@/features/calendar/components/calendar-legend"
import { CalendarStats } from "@/features/calendar/components/calendar-stats"
import { DayDetailDialog } from "@/features/calendar/components/day-detail-dialog"
import { useCalendarRecords } from "@/features/calendar/hooks/use-calendar-records"
import { useRoutine } from "@/features/routine/hooks/use-routine"
import { computeMonthStats } from "@/features/study-session/utils/study-session"
import { useStudySettings } from "@/hooks/use-study-settings"
import { getCurrentMonthMeta } from "@/utils/date"

export function CalendarioView() {
  const { settings, hydrated } = useStudySettings()
  const { routine, isLoading: routineLoading } = useRoutine()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const { records, nowMs } = useCalendarRecords()

  const { year, month } = getCurrentMonthMeta()

  const monthStats = computeMonthStats(year, month, settings, records, routine)

  const handleSelect = (day: number) => {
    setSelectedDay(day)
    setOpen(true)
  }

  if (!hydrated || routineLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title="Calendário" description="Carregando..." />
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-5 overflow-x-hidden sm:gap-6">
      <PageHeading title="Calendário" align="center" />

      <div className="grid w-full max-w-full min-w-0 items-stretch gap-5 xl:grid-cols-[300px_minmax(0,1fr)_320px] xl:gap-6">
        <div className="order-2 h-full xl:order-1">
          <Card className="p-0 lg:hidden">
            <Accordion>
              <AccordionItem value="legend" className="border-none">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold">
                  Legenda de cores
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <CalendarLegend />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
          <Card className="hidden h-full p-4 lg:block">
            <h3 className="text-foreground mb-3 text-xl font-semibold">
              Legenda de cores
            </h3>
            <CalendarLegend />
          </Card>
        </div>

        <CalendarGrid
          year={year}
          month={month}
          records={records}
          settings={settings}
          routine={routine}
          onSelectDay={handleSelect}
        />

        <div className="order-3 h-full">
          <Card className="flex h-full flex-col p-4">
            <h3 className="text-foreground mb-4 text-xl font-semibold">
              Estatísticas do mês
            </h3>
            <CalendarStats monthStats={monthStats} />
          </Card>
        </div>
      </div>

      <DayDetailDialog
        day={selectedDay}
        year={year}
        month={month}
        open={open}
        onOpenChange={setOpen}
        records={records}
        settings={settings}
        routine={routine}
        nowMs={nowMs}
      />
    </div>
  )
}
