import { Bell, Moon, Palette, Sun } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { SettingRow } from "@/features/settings/components/setting-row"
import type { Theme } from "@/types/theme"

interface AppearanceSettingsCardProps {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export function AppearanceSettingsCard({ theme, setTheme }: AppearanceSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Palette className="size-4" />
          </span>
          <CardTitle className="text-xl">Aparência</CardTitle>
        </div>
        <CardDescription>Escolha o tema da aplicação</CardDescription>
      </CardHeader>
      <CardContent>
        <SettingRow label="Tema" description="Alterne entre claro e escuro">
          <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <span className="flex items-center gap-2">
                  <Sun className="size-4" /> Claro
                </span>
              </SelectItem>
              <SelectItem value="dark">
                <span className="flex items-center gap-2">
                  <Moon className="size-4" /> Escuro
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <Separator />
        <SettingRow label="Lembretes" description="Notificar sobre blocos da rotina">
          <span className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            <Switch defaultChecked />
          </span>
        </SettingRow>
      </CardContent>
    </Card>
  )
}

