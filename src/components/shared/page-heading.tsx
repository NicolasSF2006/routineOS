import { cn } from "@/lib/utils"

interface PageHeadingProps {
  title: string
  description?: string
  align?: "left" | "center"
}

export function PageHeading({ title, description, align = "left" }: PageHeadingProps) {
  return (
    <div className={cn(align === "center" && "text-center")}>
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}
