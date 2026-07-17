import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"
import { mentorRoutineProposal } from "../fixtures/mentor"
import { filledRoutine, preparePage } from "../helpers/browser-state"

async function audit(page: Page) {
  // O contraste permanece fora do gate porque qualquer correção depende de
  // aprovação visual. A suíte cobre estrutura, semântica e interação.
  const results = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze()
  expect(results.violations).toEqual([])
}

async function openBuilder(page: Page) {
  await preparePage(page, { routine: filledRoutine, view: "configurar-rotina" })
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Configurar rotina" }),
  ).toBeVisible()
}

async function openBlockMenu(page: Page) {
  await page
    .locator('[aria-label="Abrir ações do bloco"]:visible')
    .first()
    .evaluate((button) => (button as HTMLElement).click())
}

test("@a11y página principal com rotina vazia", async ({ page }) => {
  await preparePage(page)
  await page.goto("/")
  await audit(page)
})

test("@a11y página principal com rotina preenchida", async ({ page }) => {
  await preparePage(page, { routine: filledRoutine })
  await page.goto("/")
  await audit(page)
})

test("@a11y construtor de rotina", async ({ page }) => {
  await openBuilder(page)
  await audit(page)
})

test("@a11y dropdown de ações do bloco", async ({ page }) => {
  await openBuilder(page)
  await openBlockMenu(page)
  await audit(page)
})

test("@a11y modal de edição", async ({ page }) => {
  await openBuilder(page)
  await openBlockMenu(page)
  await page
    .getByRole("button", { name: "Editar", exact: true })
    .evaluate((button) => (button as HTMLElement).click())
  await expect(page.getByRole("dialog")).toBeVisible()
  await audit(page)
})

test("@a11y confirmação de exclusão", async ({ page }) => {
  await openBuilder(page)
  await openBlockMenu(page)
  await page
    .getByRole("button", { name: "Excluir", exact: true })
    .evaluate((button) => (button as HTMLElement).click())
  await expect(page.getByRole("dialog")).toBeVisible()
  await audit(page)
})

for (const view of ["calendario", "trilhas", "configuracoes"] as const) {
  test(`@a11y tela ${view}`, async ({ page }) => {
    await preparePage(page, { routine: filledRoutine, view })
    await page.goto("/")
    await page.locator("main").waitFor()
    await audit(page)
  })
}

test("@a11y Mentor aberto", async ({ page }, testInfo) => {
  await preparePage(page, { routine: filledRoutine })
  await page.goto("/")
  if (testInfo.project.name === "mobile") {
    await page.getByLabel("Abrir menu").click()
    await page.getByRole("button", { name: "Mentor IA" }).click()
  } else {
    await page.getByLabel("Abrir Mentor IA").click()
  }
  await audit(page)
})

test("@a11y card de proposta do Mentor", async ({ page }, testInfo) => {
  await preparePage(page, { routine: filledRoutine })
  await page.addInitScript((proposal) => {
    localStorage.setItem(
      "routineos-mentor-chat",
      JSON.stringify([
        {
          id: "proposal-a11y",
          role: "assistant",
          content: "Proposta pronta.",
          createdAt: "2026-07-14T13:00:00.000Z",
          action: { type: "propose-routine", routine: proposal },
        },
      ]),
    )
  }, mentorRoutineProposal)
  await page.goto("/")
  if (testInfo.project.name === "mobile") {
    await page.getByLabel("Abrir menu").click()
    await page.getByRole("button", { name: "Mentor IA" }).click()
  } else {
    await page.getByLabel("Abrir Mentor IA").click()
  }
  await expect(
    page.getByRole("button", { name: /Abrir rascunho/ }),
  ).toBeVisible()
  await audit(page)
})

test("@a11y mensagem de erro do Mentor", async ({ page }, testInfo) => {
  await page.route("**/api/mentor", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Nenhum provedor está disponível." }),
    }),
  )
  await preparePage(page)
  await page.goto("/")
  if (testInfo.project.name === "mobile") {
    await page.getByLabel("Abrir menu").click()
    await page.getByRole("button", { name: "Mentor IA" }).click()
  } else {
    await page.getByLabel("Abrir Mentor IA").click()
  }
  await page.getByLabel("Mensagem para o Mentor IA").fill("Teste")
  await page.getByRole("button", { name: "Enviar" }).click()
  await expect(page.getByText("Nenhum provedor está disponível.")).toBeVisible()
  await audit(page)
})

test("@a11y menu mobile", async ({ page }, testInfo) => {
  await preparePage(page)
  await page.goto("/")
  if (testInfo.project.name === "mobile") {
    await page.getByLabel("Abrir menu").click()
    await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible()
  }
  await audit(page)
})

test("@a11y modal prende e devolve o foco, aceita Escape", async ({ page }) => {
  await openBuilder(page)
  const trigger = page
    .locator('[aria-label="Abrir ações do bloco"]:visible')
    .first()
  await trigger.focus()
  await openBlockMenu(page)
  await page
    .getByRole("button", { name: "Editar", exact: true })
    .evaluate((button) => (button as HTMLElement).click())
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(":focus")).toHaveCount(1)
  await page.keyboard.press("Tab")
  await expect(dialog.locator(":focus")).toHaveCount(1)
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
