import { Card } from "@/components/ui/card"
import { StudyControlHeader } from "@/features/study-session/components/study-control-header"

export function StudyControlLoading() {
  return (
    <Card className="border-border/80 overflow-hidden">
      <StudyControlHeader />
      <div className="text-muted-foreground p-5 text-sm">Carregando...</div>
    </Card>
  )
}
