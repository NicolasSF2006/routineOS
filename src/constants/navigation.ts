import { Calendar, GraduationCap, Settings } from "lucide-react"
import type { NavigationItem } from "@/types/navigation"

export const NAV_ITEMS: NavigationItem[] = [
  {
    key: "rotina",
    label: "Rotina",
    description: "Seus blocos de estudo do dia",
    icon: GraduationCap,
  },
  {
    key: "calendario",
    label: "Calendário",
    description: "Acompanhe seu mês",
    icon: Calendar,
  },
  {
    key: "configuracoes",
    label: "Configurações",
    description: "Sons, metas e aparência",
    icon: Settings,
  },
]

