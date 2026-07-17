import { DEFAULT_ROUTINE, LEGACY_DEFAULT_ROUTINE_ID } from "@/constants/routine"
import { STORAGE_KEYS } from "@/constants/storage"
import {
  createRoutineOSBackup,
  getActiveRoutine,
  getStoredRoutine,
  importRoutineOSBackup,
  saveStoredRoutine,
} from "@/lib/storage"
import {
  createRoutine,
  createRoutineBlock,
  createRoutineDay,
} from "../../fixtures/routine"

describe("armazenamento e backup", () => {
  it("mantém a rotina vazia quando não existem dados", () => {
    expect(getStoredRoutine()).toBeNull()
    expect(getActiveRoutine()).toEqual(DEFAULT_ROUTINE)
  })

  it("recupera com segurança de JSON inválido", () => {
    localStorage.setItem(STORAGE_KEYS.routine, "{inválido")
    expect(getStoredRoutine()).toBeNull()
  })

  it("remove a antiga rotina padrão sem criar uma nova para o usuário", () => {
    localStorage.setItem(
      STORAGE_KEYS.routine,
      JSON.stringify({ ...createRoutine(), id: LEGACY_DEFAULT_ROUTINE_ID }),
    )

    expect(getStoredRoutine()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.routine)).toBeNull()
  })

  it("preserva descrição e recorrência ao salvar e ler", () => {
    const block = createRoutineBlock({ repeatSourceId: "serie-1" })
    saveStoredRoutine(
      createRoutine({ days: [createRoutineDay("monday", [block])] }),
    )

    expect(getStoredRoutine()?.days[0].blocks[0]).toMatchObject({
      description: block.description,
      repeatSourceId: "serie-1",
    })
  })

  it("exporta e restaura backup compatível", () => {
    saveStoredRoutine(createRoutine())
    const backup = createRoutineOSBackup()
    localStorage.clear()

    const imported = importRoutineOSBackup(backup)
    expect(imported.schemaVersion).toBe(backup.schemaVersion)
    expect(getStoredRoutine()?.id).toBe("rotina-teste")
  })

  it("migra backup antigo que não possui rascunho do Mentor", () => {
    const backup = createRoutineOSBackup()
    const oldData = { ...backup.data } as Partial<typeof backup.data>
    delete oldData.mentorRoutineDraft

    const imported = importRoutineOSBackup({
      ...backup,
      schemaVersion: 3,
      data: oldData,
    })

    expect(imported.schemaVersion).toBe(3)
    expect(imported.data.mentorRoutineDraft).toBeNull()
  })

  it("rejeita versão de backup criada por formato futuro desconhecido", () => {
    const backup = createRoutineOSBackup()
    expect(() =>
      importRoutineOSBackup({ ...backup, schemaVersion: 999 }),
    ).toThrow("Arquivo de backup inválido.")
  })

  it("rejeita arquivo que não pertence ao RoutineOS", () => {
    expect(() => importRoutineOSBackup({ app: "outro", data: {} })).toThrow(
      "Arquivo de backup inválido.",
    )
  })
})
