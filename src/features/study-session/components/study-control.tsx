"use client"

import { Card } from "@/components/ui/card"
import { formatTime } from "@/utils/date"
import { PresenceStatus } from "@/features/study-session/components/presence-status"
import { StudyActionButtons } from "@/features/study-session/components/study-action-buttons"
import { StudyControlHeader } from "@/features/study-session/components/study-control-header"
import { StudyControlLoading } from "@/features/study-session/components/study-control-loading"
import { StudyGoalBanner } from "@/features/study-session/components/study-goal-banner"
import { StudyTimerPanel } from "@/features/study-session/components/study-timer-panel"
import { useStudySession } from "@/features/study-session/hooks/use-study-session"

export function StudyControl() {
  const {
    record,
    controlState,
    activeSeconds,
    bonusSeconds,
    goalSeconds,
    metaReached,
    progress,
    hydrated,
    markPresence,
    startStudy,
    pauseStudy,
    resumeStudy,
    completeStudy,
    cancelDay,
    resetDay,
  } = useStudySession()

  if (!hydrated) {
    return <StudyControlLoading />
  }

  const presenceTime = record?.presenceAt ? formatTime(record.presenceAt) : null
  const showTimer =
    controlState === "estudando" ||
    controlState === "pausado" ||
    controlState === "concluido"

  return (
    <Card className="overflow-hidden border-border/80">
      <StudyControlHeader />

      <div className="flex flex-col gap-5 p-5">
        <PresenceStatus presenceTime={presenceTime} />

        {showTimer ? (
          <StudyTimerPanel
            controlState={controlState}
            activeSeconds={activeSeconds}
            goalSeconds={goalSeconds}
            metaReached={metaReached}
            progress={progress}
          />
        ) : null}

        {metaReached && controlState !== "inicial" ? (
          <StudyGoalBanner bonusSeconds={bonusSeconds} />
        ) : null}

        <StudyActionButtons
          controlState={controlState}
          metaReached={metaReached}
          markPresence={markPresence}
          startStudy={startStudy}
          pauseStudy={pauseStudy}
          resumeStudy={resumeStudy}
          completeStudy={completeStudy}
          cancelDay={cancelDay}
          resetDay={resetDay}
        />
      </div>
    </Card>
  )
}
