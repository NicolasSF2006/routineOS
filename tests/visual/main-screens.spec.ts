import { test } from "@playwright/test"
import {
  conflictingRoutine,
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

test("@visual primeiro acesso sem rotina", async ({ page }) => {
  await openStablePage(page)
  await screenshot(page, "routine-empty.png")
})

test("@visual rotina preenchida", async ({ page }) => {
  await openStablePage(page, { routine: filledRoutine })
  await screenshot(page, "routine-filled.png")
})

test("@visual rotina com conflito", async ({ page }) => {
  await openStablePage(page, {
    routine: conflictingRoutine,
    view: "configurar-rotina",
  })
  await screenshot(page, "routine-builder-conflict.png")
})

test("@visual montar rotina responsivo", async ({ page }) => {
  await openStablePage(page, {
    routine: filledRoutine,
    view: "configurar-rotina",
  })
  await screenshot(page, "routine-builder.png")
})

test("@visual modal de edição", async ({ page }) => {
  await openStablePage(page, {
    routine: filledRoutine,
    view: "configurar-rotina",
  })
  await openBlockMenu(page)
  await page
    .getByRole("button", { name: "Editar" })
    .evaluate((button) => (button as HTMLElement).click())
  await screenshot(page, "routine-edit-dialog.png")
})

test("@visual calendário vazio", async ({ page }) => {
  await openStablePage(page, { view: "calendario" })
  await screenshot(page, "calendar-empty.png")
})

test("@visual trilha vazia", async ({ page }) => {
  await openStablePage(page, { routine: filledRoutine, view: "trilhas" })
  await screenshot(page, "trails-empty.png")
})

test("@visual configurações", async ({ page }) => {
  await openStablePage(page, { routine: filledRoutine, view: "configuracoes" })
  await screenshot(page, "settings.png")
})

test("@visual resposta Markdown", async ({ page }) => {
  await preparePage(page, { routine: filledRoutine })
  await seedMentorMessage(page, {
    id: "markdown",
    role: "assistant",
    content: "## Plano\n\n- **Revisar** teoria\n- Fazer exercícios",
    createdAt: "2026-07-14T13:00:00.000Z",
  })
  await page.goto("/")
  await disableVisualMotion(page)
  await openMentor(page)
  await screenshot(page, "mentor-open-markdown.png")
})
