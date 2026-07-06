import { cn } from "@/lib/utils"

interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
  disabled?: boolean
}

export function SettingRow({ label, description, children, disabled }: SettingRowProps) {
  return (
    <div className={cn("flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4", disabled && "opacity-60")}>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description ? <span className="wrap-break-word text-sm text-muted-foreground">{description}</span> : null}
      </div>
      <div className="flex w-full shrink-0 items-center sm:w-auto sm:justify-end">{children}</div>
    </div>
  )
}
