"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PageHeading } from "@/components/shared/page-heading"
import { WEEK_DAYS } from "@/constants/routine"
import { StudyControl } from "@/features/study-session/components/study-control"
import { RoutineBlockRow } from "@/features/routine/components/routine-block-row"
import { useRoutineSchedule } from "@/features/routine/hooks/use-routine-schedule"
import { getRoutineDayBlocks } from "@/features/routine/utils/routine-domain"
import type { Weekday } from "@/types/study"

export function RoutineView() {
  const { routine, activeDay, setActiveDay, currentBlockIndex } = useRoutineSchedule()

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Rotina"
        description="Acompanhe seus blocos de estudo ao longo da semana."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <Tabs
          value={activeDay}
          onValueChange={(value) => setActiveDay(value as Weekday)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            {WEEK_DAYS.map((day) => (
              <TabsTrigger key={day.key} value={day.key} className="text-xs sm:text-sm">
                <span className="sm:hidden">{day.short}</span>
                <span className="hidden sm:inline">{day.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {WEEK_DAYS.map((day) => (
            <TabsContent key={day.key} value={day.key} className="mt-4">
              <div className="flex flex-col gap-2">
                {getRoutineDayBlocks(routine, day.key).map((block, index) => (
                  <RoutineBlockRow
                    key={block.id}
                    block={block}
                    isCurrent={day.key === activeDay && index === currentBlockIndex}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="lg:sticky lg:top-20">
          <StudyControl />
        </div>
      </div>
    </div>
  )
}
