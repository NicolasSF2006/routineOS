import { expect, test, type Page } from "@playwright/test"
import { studyTrailFixture as trail } from "../fixtures/trail"
import {
  FIXED_TIME,
  filledRoutine,
  preparePage,
} from "../helpers/browser-state"

async function openRoutine(page: Page) {
  await preparePage(page, { routine: filledRoutine, view: "rotina" })
  await page.addInitScript(() =>
    localStorage.setItem(
      "study-app-settings",
      JSON.stringify({
        dailyGoalHours: 0.001,
        monthlyGoalHours: 1,
        routineMode: "no-work",
        customSounds: [],
        soundPreferences: {
          shortBreak: { audioId: "default", startSeconds: 0, endSeconds: null },
          longBreak: { audioId: "default", startSeconds: 0, endSeconds: null },
          lunch: { audioId: "default", startSeconds: 0, endSeconds: null },
          subjectChange: {
            audioId: "default",
            startSeconds: 0,
            endSeconds: null,
          },
        },
      }),
    ),
  )
  await page.goto("/")
}

async function openSettingsData(page: Page) {
  await preparePage(page, { view: "configuracoes" })
  await page.goto("/")
  await page.getByRole("tab", { name: "Dados e backup" }).click()
}

test.describe("sessão, calendário, trilha e configurações", () => {
  test("marca presença", async ({ page }) => {
    await openRoutine(page)
    await page.getByRole("button", { name: "Marcar Presença" }).click()
    await expect(page.getByText(/Presença marcada às/)).toBeVisible()
  })

  test("inicia uma sessão de estudo", async ({ page }) => {
    await openRoutine(page)
    await page.getByRole("button", { name: "Marcar Presença" }).click()
    await page.getByRole("button", { name: "Começar Estudos" }).click()
    await expect(
      page.getByRole("button", { name: "Pausar Estudos" }),
    ).toBeVisible()
  })

  test("pausa uma sessão de estudo", async ({ page }) => {
    await openRoutine(page)
    await page.getByRole("button", { name: "Marcar Presença" }).click()
    await page.getByRole("button", { name: "Começar Estudos" }).click()
    await page.getByRole("button", { name: "Pausar Estudos" }).click()
    await expect(
      page.getByRole("button", { name: "Retomar Estudos" }),
    ).toBeVisible()
  })

  test("conclui uma sessão completa", async ({ page }) => {
    await openRoutine(page)
    await page.getByRole("button", { name: "Marcar Presença" }).click()
    await page.getByRole("button", { name: "Começar Estudos" }).click()

    // `setFixedTime` mantém os timers reais, mas fixa `Date.now()`.
    // Avançamos apenas a data simulada e aguardamos um ciclo do intervalo da UI.
    await page.clock.setFixedTime(new Date(FIXED_TIME.getTime() + 4_000))
    await page.waitForTimeout(1_100)

    await expect(
      page.getByRole("button", { name: "Concluir Estudos" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Concluir Estudos" }).click()
    await expect(page.getByText(/Dia concluído/)).toBeVisible()
  })

  test("atualiza o calendário após marcar presença", async ({ page }) => {
    await openRoutine(page)
    await page.getByRole("button", { name: "Marcar Presença" }).click()
    await page.getByRole("button", { name: "Calendário" }).click()
    await expect(
      page.getByRole("heading", { name: "Calendário" }),
    ).toBeVisible()
    expect(
      await page.evaluate(() => localStorage.getItem("study-app-records")),
    ).toContain("2026-07-14")
  })

  test("gera trilha com resposta mockada", async ({ page }) => {
    await page.route("**/api/mentor/trail", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ trail, reply: "Trilha criada.", mode: "mock" }),
      }),
    )
    await preparePage(page, { routine: filledRoutine, view: "trilhas" })
    await page.goto("/")
    await page
      .getByRole("button", { name: "Gerar trilha da rotina completa" })
      .click()
    await expect(
      page.getByText("TypeScript", { exact: true }).first(),
    ).toBeVisible()
  })

  test("mostra recomendações diferentes por tema", async ({ page }) => {
    await preparePage(page, { view: "trilhas" })
    await page.addInitScript(
      (value) =>
        localStorage.setItem(
          "routineos-mentor-trails",
          JSON.stringify([value]),
        ),
      trail,
    )
    await page.goto("/")
    await expect(page.getByText("TypeScript Handbook")).toBeVisible()
    await page.getByRole("button", { name: /Tema sem catálogo/ }).click()
    await expect(
      page.getByText(
        "Ainda não há recursos confiáveis cadastrados para este tema.",
      ),
    ).toBeVisible()
  })

  test("preserva cursos e favoritos ao regenerar a trilha", async ({
    page,
  }) => {
    const current = structuredClone(trail)
    current.topics[0].favoriteResourceIds = ["ts-docs"]
    current.topics[0].userCourses = [
      {
        id: "curso-e2e",
        title: "Curso local",
        url: "https://example.com/curso",
        platform: "Local",
        createdAt: "2026-07-14T13:00:00.000Z",
        isFavorite: true,
      },
    ]
    await preparePage(page, { view: "trilhas" })
    await page.addInitScript(
      (value) =>
        localStorage.setItem(
          "routineos-mentor-trails",
          JSON.stringify([value]),
        ),
      current,
    )
    await page.route("**/api/mentor/trail", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          trail: { ...trail, createdAt: "2026-07-14T14:00:00.000Z" },
          reply: "Atualizada.",
          mode: "mock",
        }),
      }),
    )
    await page.goto("/")
    await page
      .getByRole("button", { name: /Regenerar trilha|Atualizar trilha/ })
      .click()
    await expect(page.getByText("Curso local")).toBeVisible()
    await expect(page.getByLabel("Remover dos favoritos")).toBeVisible()
  })

  test("exporta backup local", async ({ page }) => {
    await openSettingsData(page)
    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "Exportar backup" }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(
      /^routineos-backup-2026-07-14\.json$/,
    )
    await expect(page.getByText("Backup exportado com sucesso.")).toBeVisible()
  })

  test("importa backup válido", async ({ page }) => {
    await openSettingsData(page)
    page.on("dialog", (dialog) => dialog.accept())
    await page.locator('input[type="file"]').setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          app: "RoutineOS",
          schemaVersion: 4,
          exportedAt: "2026-07-14T13:00:00.000Z",
          data: {
            settings: {},
            records: {},
            routine: filledRoutine,
            view: "rotina",
            theme: "light",
            onboardingCompleted: true,
            mentorChat: [],
            mentorTrails: [],
            mentorRoutineDraft: null,
          },
        }),
      ),
    })
    await expect(page.getByText(/Backup importado com sucesso/)).toBeVisible()
  })

  test("rejeita backup inválido", async ({ page }) => {
    await openSettingsData(page)
    page.on("dialog", (dialog) => dialog.accept())
    await page.locator('input[type="file"]').setInputFiles({
      name: "invalido.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"app":"outro"}'),
    })
    await expect(page.getByText(/Não foi possível importar/)).toBeVisible()
  })

  test("navega por todas as tabs de configurações", async ({ page }) => {
    await preparePage(page, { view: "configuracoes" })
    await page.goto("/")
    for (const label of [
      "Sons",
      "Rotina",
      "Metas",
      "Aparência",
      "Ajuda",
      "Dados e backup",
    ]) {
      const tab = page.getByRole("tab", { name: label })
      await tab.click()
      await expect(tab).toHaveAttribute("aria-selected", "true")
    }
  })
})
