"use client"

import { useRef, useState } from "react"
import { Database, Download, RefreshCcw, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createRoutineOSBackup,
  importRoutineOSBackup,
  resetStoredAppData,
  restoreDefaultSettings,
} from "@/lib/storage"

function createBackupFilename() {
  const date = new Date().toISOString().slice(0, 10)
  return `routineos-backup-${date}.json`
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function DataBackupSettingsCard() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleExportBackup = () => {
    const backup = createRoutineOSBackup()
    downloadJson(createBackupFilename(), backup)
    setMessage("Backup exportado com sucesso.")
  }

  const handleImportBackup = async (file: File | null) => {
    if (!file) return

    const confirmed = window.confirm(
      "Importar este backup vai substituir rotina, histórico, configurações, tema e tela atual. Deseja continuar?",
    )

    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    try {
      const content = await file.text()
      importRoutineOSBackup(JSON.parse(content))
      setMessage("Backup importado com sucesso. Recarregue a página se alguma tela não atualizar imediatamente.")
    } catch {
      setMessage("Não foi possível importar este arquivo. Verifique se ele é um backup válido do RoutineOS.")
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRestoreDefaults = () => {
    const confirmed = window.confirm(
      "Restaurar padrões vai apagar preferências de sons, metas e aparência das configurações. A rotina e o histórico serão mantidos. Deseja continuar?",
    )

    if (!confirmed) return

    restoreDefaultSettings()
    setMessage("Configurações restauradas para o padrão.")
  }

  const handleResetAllData = () => {
    const confirmed = window.confirm(
      "Resetar tudo vai apagar rotina personalizada, histórico de estudos, sons importados, metas, tema e tela atual. Esta ação não pode ser desfeita sem backup. Deseja continuar?",
    )

    if (!confirmed) return

    resetStoredAppData()
    setMessage("Todos os dados locais foram resetados.")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Database className="size-4" />
          </span>
          <CardTitle className="text-xl">Dados e backup</CardTitle>
        </div>
        <CardDescription>Exporte, importe ou limpe os dados locais do RoutineOS</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-base font-medium text-foreground">Backup completo</span>
            <span className="wrap-break-word text-sm text-muted-foreground">
              Inclui rotina, histórico, configurações, sons importados, tema e última tela acessada.
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 whitespace-normal text-center"
              onClick={handleExportBackup}
            >
              <Download className="mr-2 size-4" />
              Exportar backup
            </Button>

            <Button
              type="button"
              variant="outline"
              className="min-h-11 whitespace-normal text-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 size-4" />
              Importar backup
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void handleImportBackup(event.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-base font-medium text-foreground">Ações de segurança</span>
            <span className="wrap-break-word text-sm text-muted-foreground">
              Use com cuidado. Crie um backup antes de apagar ou restaurar dados importantes.
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 whitespace-normal text-center"
              onClick={handleRestoreDefaults}
            >
              <RefreshCcw className="mr-2 size-4" />
              Restaurar configurações
            </Button>

            <Button
              type="button"
              variant="destructive"
              className="min-h-11 whitespace-normal text-center"
              onClick={handleResetAllData}
            >
              <Trash2 className="mr-2 size-4" />
              Resetar tudo
            </Button>
          </div>
        </div>

        {message ? <p className="text-center text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  )
}
