import { cn } from "@/lib/utils"

interface PageHeadingProps {
  title: string
  description?: string
  align?: "left" | "center"
}

export function PageHeading({
  title,
  description,
  align = "left",
}: PageHeadingProps) {
  return (
    <div className={cn(align === "center" && "text-center")}>
      <h2 className="text-foreground text-2xl font-semibold">{title}</h2>
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
    </div>
  )
}
