import { expect, test } from "@playwright/test"
import { mentorRoutineProposal } from "../fixtures/mentor"
import { studyTrailFixture } from "../fixtures/trail"
import {
  disableVisualMotion,
  filledRoutine,
  preparePage,
} from "../helpers/browser-state"
import {
  openBlockMenu,
  openMentor,
  openStablePage,
  screenshot,
  seedMentorMessage,
} from "./visual-helpers"

test("@visual confirmação de exclusão", async ({ page }) => {
  await openStablePage(page, {
    routine: filledRoutine,
    view: "configurar-rotina",
  })
  await openBlockMenu(page)
  await page
    .getByRole("button", { name: "Excluir", exact: true })
    .evaluate((button) => (button as HTMLElement).click())
  await screenshot(page, "routine-delete-confirmation.png")
})

test("@visual dropdown dos três pontos", async ({ page }) => {
  await openStablePage(page, {
    routine: filledRoutine,
    view: "configurar-rotina",
  })
  await openBlockMenu(page)
  await screenshot(page, "routine-block-dropdown.png")
})

test("@visual undo habilitado", async ({ page }) => {
  await openStablePage(page, { view: "configurar-rotina" })
  await page.getByLabel("Painel de blocos").hover()
  await page.getByRole("button", { name: /^Tarefa/ }).click()
  await page.mouse.move(20, 200)
  await screenshot(page, "routine-undo-enabled.png")
})

test("@visual redo habilitado", async ({ page }) => {
  await openStablePage(page, { view: "configurar-rotina" })
  await page.getByLabel("Painel de blocos").hover()
  await page.getByRole("button", { name: /^Tarefa/ }).click()
  await page.mouse.move(20, 200)
  await page.locator('[aria-label="Desfazer última alteração"]:visible').click()
  await screenshot(page, "routine-redo-enabled.png")
})

test("@visual botão Salvar desabilitado", async ({ page }) => {
  await openStablePage(page, {
    routine: filledRoutine,
    view: "configurar-rotina",
  })
  await screenshot(page, "routine-save-disabled.png")
})

test("@visual botão Salvar habilitado", async ({ page }) => {
  await openStablePage(page, { view: "configurar-rotina" })
  await page.getByLabel("Painel de blocos").hover()
  await page.getByRole("button", { name: /^Tarefa/ }).click()
  await page.mouse.move(20, 200)
  await screenshot(page, "routine-save-enabled.png")
})

test("@visual calendário preenchido", async ({ page }) => {
  await preparePage(page, { routine: filledRoutine, view: "calendario" })
  await page.addInitScript(() =>
    localStorage.setItem(
      "study-app-records",
      JSON.stringify({
        "2026-07-14": {
          dateKey: "2026-07-14",
          presenceAt: "2026-07-14T13:00:00.000Z",
          studyStartedAt: "2026-07-14T13:05:00.000Z",
          activeSeconds: 3600,
          pauseSeconds: 300,
          routineBreakSeconds: 0,
          bonusSeconds: 0,
          status: "completed",
          pauses: [],
          completedAt: "2026-07-14T14:10:00.000Z",
          canceledAt: null,
          resumedAt: null,
          updatedAt: "2026-07-14T14:10:00.000Z",
          activeSegmentStartedAt: null,
          routineBreakSegmentStartedAt: null,
          routineBlockIndex: 0,
          routineBlockElapsedSeconds: 0,
          awaitingNextBlock: false,
        },
      }),
    ),
  )
  await page.goto("/")
  await disableVisualMotion(page)
  await screenshot(page, "calendar-filled.png")
})

test("@visual trilha gerada e recomendação específica", async ({ page }) => {
  await preparePage(page, { routine: filledRoutine, view: "trilhas" })
  await page.addInitScript(
    (trail) =>
      localStorage.setItem("routineos-mentor-trails", JSON.stringify([trail])),
    studyTrailFixture,
  )
  await page.goto("/")
  await disableVisualMotion(page)
  await screenshot(page, "trails-generated-typescript.png")
})

test("@visual tema sem recurso confiável", async ({ page }) => {
  await preparePage(page, { routine: filledRoutine, view: "trilhas" })
  await page.addInitScript(
    (trail) =>
      localStorage.setItem("routineos-mentor-trails", JSON.stringify([trail])),
    studyTrailFixture,
  )
  await page.goto("/")
  await page.getByRole("button", { name: /Tema sem catálogo/ }).click()
  await disableVisualMotion(page)
  await screenshot(page, "trails-no-trusted-resource.png")
})

test("@visual Mentor fechado", async ({ page }) => {
  await openStablePage(page, { routine: filledRoutine })
  await screenshot(page, "mentor-closed.png")
})

test("@visual Mentor aberto", async ({ page }) => {
  await openStablePage(page, { routine: filledRoutine })
  await openMentor(page)
  await screenshot(page, "mentor-open.png")
})

for (const actionType of ["preview-routine", "propose-routine"] as const) {
  test(`@visual card ${actionType}`, async ({ page }) => {
    await preparePage(page, { routine: filledRoutine })
    await seedMentorMessage(page, {
      id: actionType,
      role: "assistant",
      content:
        actionType === "preview-routine"
          ? "Revise a prévia."
          : "Rascunho pronto.",
      createdAt: "2026-07-14T13:00:00.000Z",
      action: { type: actionType, routine: mentorRoutineProposal },
    })
    await page.goto("/")
    await disableVisualMotion(page)
    await openMentor(page)
    await screenshot(page, `mentor-${actionType}.png`)
  })
}

test("@visual aplicação do rascunho do Mentor", async ({ page }) => {
  await preparePage(page, { routine: filledRoutine, view: "configurar-rotina" })
  await page.addInitScript(
    (proposal) =>
      localStorage.setItem(
        "routineos-mentor-routine-draft",
        JSON.stringify(proposal),
      ),
    mentorRoutineProposal,
  )
  await page.goto("/")
  await disableVisualMotion(page)
  await screenshot(page, "mentor-draft-applied.png")
})

test("@visual carregamento do Mentor", async ({ page }) => {
  await page.route("**/api/mentor", async () => new Promise(() => undefined))
  await openStablePage(page, { routine: filledRoutine })
  await openMentor(page)
  await page.getByLabel("Mensagem para o Mentor IA").fill("Carregue")
  await page.getByRole("button", { name: "Enviar" }).click()
  await expect(page.getByText("Mentor está pensando...")).toBeVisible()
  await screenshot(page, "mentor-loading.png")
})

for (const [name, message] of [
  ["error", "Não foi possível responder agora."],
  ["all-providers-unavailable", "Nenhum provedor de IA está disponível agora."],
] as const) {
  test(`@visual Mentor ${name}`, async ({ page }) => {
    await page.route("**/api/mentor", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: message }),
      }),
    )
    await openStablePage(page, { routine: filledRoutine })
    await openMentor(page)
    await page.getByLabel("Mensagem para o Mentor IA").fill("Teste")
    await page.getByRole("button", { name: "Enviar" }).click()
    await expect(page.getByText(message)).toBeVisible()
    await screenshot(page, `mentor-${name}.png`)
  })
}

test("@visual comando provedores", async ({ page }) => {
  await preparePage(page, { routine: filledRoutine })
  await seedMentorMessage(page, {
    id: "providers",
    role: "assistant",
    content:
      "**Gemini:** disponível\n\n**Groq:** sem chave\n\n**OpenRouter:** disponível",
    createdAt: "2026-07-14T13:00:00.000Z",
  })
  await page.goto("/")
  await disableVisualMotion(page)
  await openMentor(page)
  await screenshot(page, "mentor-providers-command.png")
})

for (const state of ["active", "paused"] as const) {
  test(`@visual sessão de estudo ${state}`, async ({ page }) => {
    await preparePage(page, { routine: filledRoutine })
    await page.addInitScript(
      ({ paused }) =>
        localStorage.setItem(
          "study-app-records",
          JSON.stringify({
            "2026-07-14": {
              dateKey: "2026-07-14",
              presenceAt: "2026-07-14T12:55:00.000Z",
              studyStartedAt: "2026-07-14T13:00:00.000Z",
              activeSeconds: 60,
              pauseSeconds: 0,
              routineBreakSeconds: 0,
              bonusSeconds: 0,
              status: "in-progress",
              pauses: paused
                ? [
                    {
                      startedAt: "2026-07-14T13:05:00.000Z",
                      endedAt: null,
                      durationSeconds: 0,
                    },
                  ]
                : [],
              completedAt: null,
              canceledAt: null,
              resumedAt: null,
              updatedAt: "2026-07-14T13:05:00.000Z",
              activeSegmentStartedAt: paused
                ? null
                : "2026-07-14T13:05:00.000Z",
              routineBreakSegmentStartedAt: null,
              routineBlockIndex: 0,
              routineBlockElapsedSeconds: 60,
              awaitingNextBlock: false,
            },
          }),
        ),
      { paused: state === "paused" },
    )
    await page.goto("/")
    await disableVisualMotion(page)
    await screenshot(page, `study-session-${state}.png`)
  })
}
