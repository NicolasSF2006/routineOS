import {
  BookOpen,
  Calendar,
  GraduationCap,
  ListChecks,
  Settings,
} from "lucide-react"
import type { NavigationItem } from "@/types/navigation"

export const NAV_ITEMS: NavigationItem[] = [
  {
    key: "rotina",
    label: "Rotina",
    description: "Seus blocos de estudo do dia",
    icon: GraduationCap,
  },
  {
    key: "configurar-rotina",
    label: "Montar rotina",
    description: "Configure seus blocos e horários",
    icon: ListChecks,
  },
  {
    key: "calendario",
    label: "Calendário",
    description: "Acompanhe seu mês",
    icon: Calendar,
  },
  {
    key: "trilhas",
    label: "Trilhas",
    description: "Caminhos de estudo com recursos gratuitos",
    icon: BookOpen,
  },
  {
    key: "configuracoes",
    label: "Configurações",
    description: "Sons, metas e aparência",
    icon: Settings,
  },
]
