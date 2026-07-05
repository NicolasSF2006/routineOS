import { Card } from "@/components/ui/card"
import { StudyControlHeader } from "@/features/study-session/components/study-control-header"

export function StudyControlLoading() {
  return (
    <Card className="overflow-hidden border-border/80">
      <StudyControlHeader />
      <div className="p-5 text-sm text-muted-foreground">Carregando...</div>
    </Card>
  )
}

