"use client"

import { ChangeEvent, useMemo, useRef, useState } from "react"
import { Music2, Upload, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  LONG_AUDIO_THRESHOLD_SECONDS,
  MAX_CUSTOM_SOUND_SIZE_BYTES,
  SOUND_EVENT_OPTIONS,
} from "@/constants/settings"
import { cn } from "@/lib/utils"
import type { CustomSound, SoundEventKey, SoundPreference, StudySettings } from "@/types/study"

interface SoundSettingsCardProps {
  settings: StudySettings
  updateSettings: (patch: Partial<StudySettings>) => void
}

type WindowWithAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  return `${minutes}m ${String(rest).padStart(2, "0")}s`
}

function createSoundId(): string {
  return `custom-sound-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getSoundPreference(
  preferences: StudySettings["soundPreferences"],
  key: SoundEventKey,
): SoundPreference {
  return preferences[key] ?? { audioId: "default", startSeconds: 0, endSeconds: null }
}

const SOUND_TOGGLE_FIELDS: Record<
  SoundEventKey,
  "soundShortBreak" | "soundLongBreak" | "soundLunch" | "soundSubjectChange"
> = {
  shortBreak: "soundShortBreak",
  longBreak: "soundLongBreak",
  lunch: "soundLunch",
  subjectChange: "soundSubjectChange",
}

function getSoundEnabled(settings: StudySettings, key: SoundEventKey): boolean {
  const field = SOUND_TOGGLE_FIELDS[key]
  return settings[field] ?? true
}

function playDefaultBell() {
  const AudioCtx = window.AudioContext ?? (window as WindowWithAudioContext).webkitAudioContext
  if (!AudioCtx) return

  const context = new AudioCtx()
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(880, context.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.35)
  gain.gain.setValueAtTime(0.001, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 1)

  window.setTimeout(() => void context.close(), 1200)
}

function playCustomSound(sound: CustomSound, preference: SoundPreference) {
  const audio = new Audio(sound.dataUrl)
  const start = Math.max(0, preference.startSeconds || 0)
  const end = Math.min(sound.durationSeconds, preference.endSeconds ?? sound.durationSeconds)

  audio.currentTime = Math.min(start, Math.max(0, sound.durationSeconds - 0.1))
  void audio.play()

  if (end > start) {
    window.setTimeout(
      () => {
        audio.pause()
        audio.currentTime = start
      },
      Math.max(250, (end - start) * 1000),
    )
  }
}

function readAudioDuration(dataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.preload = "metadata"
    audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0)
    audio.onerror = () => reject(new Error("Não foi possível ler a duração do áudio."))
    audio.src = dataUrl
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Não foi possível importar o arquivo."))
    reader.readAsDataURL(file)
  })
}

export function SoundSettingsCard({ settings, updateSettings }: SoundSettingsCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const customSoundsById = useMemo(() => {
    return new Map(settings.customSounds.map((sound) => [sound.id, sound]))
  }, [settings.customSounds])

  const updatePreference = (key: SoundEventKey, patch: Partial<SoundPreference>) => {
    const current = getSoundPreference(settings.soundPreferences, key)
    updateSettings({
      soundPreferences: {
        ...settings.soundPreferences,
        [key]: {
          ...current,
          ...patch,
        },
      },
    })
  }

  const handleSelectAudio = (key: SoundEventKey, audioId: string) => {
    const sound = customSoundsById.get(audioId)
    updatePreference(key, {
      audioId,
      startSeconds: 0,
      endSeconds:
        sound && sound.durationSeconds > LONG_AUDIO_THRESHOLD_SECONDS
          ? Math.min(10, sound.durationSeconds)
          : null,
    })
  }

  const handleImportAudio = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!file.type.startsWith("audio/")) {
      setMessage("Importe apenas arquivos de áudio.")
      return
    }

    if (file.size > MAX_CUSTOM_SOUND_SIZE_BYTES) {
      setMessage("O áudio precisa ter no máximo 5 MB.")
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const durationSeconds = await readAudioDuration(dataUrl)
      const newSound: CustomSound = {
        id: createSoundId(),
        name: file.name,
        dataUrl,
        mimeType: file.type,
        sizeBytes: file.size,
        durationSeconds,
        createdAt: new Date().toISOString(),
      }

      updateSettings({ customSounds: [...settings.customSounds, newSound] })
      setMessage(`Áudio importado: ${file.name}`)
    } catch {
      setMessage("Não foi possível importar esse áudio.")
    }
  }

  const handlePlay = (key: SoundEventKey) => {
    const preference = getSoundPreference(settings.soundPreferences, key)
    if (preference.audioId === "default") {
      playDefaultBell()
      return
    }

    const sound = customSoundsById.get(preference.audioId)
    if (sound) playCustomSound(sound, preference)
  }

  return (
    <div className="relative h-[560px] [perspective:1200px] sm:h-[540px] lg:h-[520px]">
      <div
        className={cn(
          "relative h-full transition-transform duration-500 [transform-style:preserve-3d]",
          isEditing && "[transform:rotateY(180deg)]",
        )}
      >
        <Card className="absolute inset-0 flex flex-col overflow-hidden [backface-visibility:hidden]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Volume2 className="size-4" />
                </span>
                <CardTitle className="text-xl">Sons</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9"
                onClick={() => setIsEditing(true)}
              >
                Editar
              </Button>
            </div>
            <CardDescription>Áudios usados nos momentos da rotina</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {SOUND_EVENT_OPTIONS.map((option) => {
              const preference = getSoundPreference(settings.soundPreferences, option.key)
              const selectedSound = customSoundsById.get(preference.audioId)
              const name = selectedSound?.name ?? "Padrão"

              return (
                <div
                  key={option.key}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:items-center"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-base font-medium text-foreground">{option.label}</span>
                    <span className="wrap-break-word text-sm text-muted-foreground">{name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      checked={getSoundEnabled(settings, option.key)}
                      onCheckedChange={(checked: boolean) =>
                        updateSettings({
                          [SOUND_TOGGLE_FIELDS[option.key]]: checked,
                        } as Partial<StudySettings>)
                      }
                      aria-label={`Ativar ${option.label}`}
                    />
                    <Music2 className="size-5 shrink-0 text-muted-foreground" />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="absolute inset-0 flex flex-col overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Volume2 className="size-4" />
                </span>
                <CardTitle className="text-xl">Editar sons</CardTitle>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9"
                onClick={() => setIsEditing(false)}
              >
                Voltar
              </Button>
            </div>
            <CardDescription>Escolha áudios importados ou use o sino padrão</CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto pb-6">
            <div className="flex flex-col gap-4">
              {SOUND_EVENT_OPTIONS.map((option) => {
                const preference = getSoundPreference(settings.soundPreferences, option.key)
                const selectedSound = customSoundsById.get(preference.audioId)
                const isLongAudio = Boolean(
                  selectedSound && selectedSound.durationSeconds > LONG_AUDIO_THRESHOLD_SECONDS,
                )
                const maxEnd = selectedSound?.durationSeconds ?? 0
                const endValue = preference.endSeconds ?? maxEnd

                return (
                  <div key={option.key} className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <Label className="text-base font-medium text-foreground">{option.label}</Label>
                        <span className="wrap-break-word text-sm text-muted-foreground">
                          {option.description}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Select
                          value={preference.audioId}
                          onValueChange={(value) => handleSelectAudio(option.key, value ?? "default")}
                        >
                          <SelectTrigger className="min-h-10 w-full text-base sm:flex-1">
                            <span className="wrap-break-word text-left">
                              {preference.audioId === "default"
                                ? "Padrão"
                                : selectedSound?.name ?? "Padrão"}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Padrão</SelectItem>
                            {settings.customSounds.map((sound) => (
                              <SelectItem key={sound.id} value={sound.id}>
                                {sound.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-10 sm:w-auto"
                          onClick={() => handlePlay(option.key)}
                        >
                          Tocar
                        </Button>
                      </div>

                      {isLongAudio && selectedSound ? (
                        <div className="grid gap-3 rounded-lg bg-background/60 p-3 transition-all duration-300 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`${option.key}-start`} className="text-sm">
                              Iniciar áudio em
                            </Label>
                            <Input
                              id={`${option.key}-start`}
                              type="number"
                              min={0}
                              max={Math.max(0, maxEnd - 1)}
                              step={0.5}
                              value={preference.startSeconds}
                              onChange={(event) => {
                                const startSeconds = Math.max(0, Number(event.target.value) || 0)
                                updatePreference(option.key, {
                                  startSeconds,
                                  endSeconds: Math.max(startSeconds + 0.5, endValue),
                                })
                              }}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`${option.key}-end`} className="text-sm">
                              Finalizar áudio em
                            </Label>
                            <Input
                              id={`${option.key}-end`}
                              type="number"
                              min={preference.startSeconds + 0.5}
                              max={maxEnd}
                              step={0.5}
                              value={endValue}
                              onChange={(event) => {
                                const endSeconds = Math.min(
                                  maxEnd,
                                  Math.max(
                                    preference.startSeconds + 0.5,
                                    Number(event.target.value) || 0,
                                  ),
                                )
                                updatePreference(option.key, { endSeconds })
                              }}
                            />
                            <span className="text-sm text-muted-foreground">
                              Duração: {formatDuration(selectedSound.durationSeconds)}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {message ? <p className="text-center text-sm text-muted-foreground">{message}</p> : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleImportAudio}
              />
              <div className="flex flex-col items-center gap-2 pt-2 text-center">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 size-4" />
                  Importar áudio
                </Button>
                <span className="text-sm text-muted-foreground">
                  Limite de {formatFileSize(MAX_CUSTOM_SOUND_SIZE_BYTES)} por arquivo.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
