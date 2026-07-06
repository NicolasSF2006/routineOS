import type { LucideIcon } from "lucide-react"

export type ViewKey = "rotina" | "calendario" | "configuracoes" | "configurar-rotina" | "mentor"

export interface NavigationItem {
  key: ViewKey
  label: string
  description: string
  icon: LucideIcon
}
