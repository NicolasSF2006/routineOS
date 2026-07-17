import type { LucideIcon } from "lucide-react"

export type ViewKey =
  "rotina" | "calendario" | "trilhas" | "configuracoes" | "configurar-rotina"

export interface NavigationItem {
  key: ViewKey
  label: string
  description: string
  icon: LucideIcon
}
