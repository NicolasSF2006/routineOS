import { cn } from "@/lib/utils"

interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
  disabled?: boolean
}

export function SettingRow({ label, description, children, disabled }: SettingRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-3", disabled && "opacity-60")}>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
      </div>
      {children}
    </div>
  )
}

