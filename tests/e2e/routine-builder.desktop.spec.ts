import { expect, test } from "@playwright/test"
import {
  conflictingRoutine,
  filledRoutine,
  preparePage,
} from "../helpers/browser-state"
import {
  addDesktopBlock,
  clickBuilderMenuAction,
  desktopBlocks,
  dragHtml5,
  openBuilder,
  openFirstBlockActions,
  readStoredRoutine,
} from "./helpers"

test.describe("construtor de rotina no desktop", () => {
  test("primeiro acesso não cria rotina padrão", async ({ page }) => {
    await preparePage(page, { onboarding: false })
    await page.goto("/")
    await page.getByRole("button", { name: "Pular tutorial" }).click()
    await expect(
      page.getByText("Nenhuma rotina foi criada ainda."),
    ).toBeVisible()
    expect(await readStoredRoutine(page)).toBeNull()
  })

  test("cria manualmente um bloco", async ({ page }) => {
    await openBuilder(page)
    await addDesktopBlock(page)
    await expect(page.getByText("Nova tarefa").first()).toBeVisible()
    await expect(page.getByRole("button", { name: "Salvar" })).toBeEnabled()
  })

  test("edita um bloco preservando a descrição", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    await openFirstBlockActions(page)
    await clickBuilderMenuAction(page, "Editar")
    await page.getByLabel("Nome").fill("TypeScript editado")
    await page.getByLabel("Descrição").fill("Descrição técnica")
    await page.getByRole("button", { name: "Salvar bloco" }).click()
    await expect(page.getByText("TypeScript editado").first()).toBeVisible()
  })

  test("exclui um bloco somente após confirmação", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    await openFirstBlockActions(page)
    await clickBuilderMenuAction(page, "Excluir")
    await expect(
      page.getByRole("dialog", { name: "Excluir bloco?" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Excluir bloco" }).click()
    await expect(page.getByText("TypeScript")).toHaveCount(0)
  })

  test("cancela a exclusão sem remover o bloco", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    await openFirstBlockActions(page)
    await clickBuilderMenuAction(page, "Excluir")
    await page.getByRole("button", { name: "Cancelar" }).click()
    await expect(page.getByText("TypeScript").first()).toBeVisible()
  })

  test("cria uma rotina completa com tarefa, pausa e projeto", async ({
    page,
  }) => {
    await openBuilder(page)
    await addDesktopBlock(page, /^Tarefa/)
    await addDesktopBlock(page, /^Pausa curta/)
    await addDesktopBlock(page, /^Projeto/)
    await expect(desktopBlocks(page)).toHaveCount(3)
  })

  test("salva a rotina no localStorage", async ({ page }) => {
    await openBuilder(page)
    await addDesktopBlock(page)
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    expect(await readStoredRoutine(page)).toContain("Nova tarefa")
  })

  test("mantém Salvar desabilitado sem alterações", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    await expect(page.getByRole("button", { name: "Salvo" })).toBeDisabled()
  })

  test("desfaz a criação de um bloco", async ({ page }) => {
    await openBuilder(page)
    await addDesktopBlock(page)
    await page
      .locator('[aria-label="Desfazer última alteração"]:visible')
      .click()
    await expect(desktopBlocks(page)).toHaveCount(0)
  })

  test("refaz a criação desfeita", async ({ page }) => {
    await openBuilder(page)
    await addDesktopBlock(page)
    await page
      .locator('[aria-label="Desfazer última alteração"]:visible')
      .click()
    await page.locator('[aria-label="Refazer alteração"]:visible').click()
    await expect(desktopBlocks(page)).toHaveCount(1)
  })

  test("desfaz uma movimentação", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    const block = page
      .locator(".routine-builder-schedule-block")
      .filter({ hasText: "TypeScript" })
    const lane = page.locator(
      '[data-routine-day-lane="true"][data-routine-weekday="wednesday"]',
    )
    await dragHtml5(page, block, lane, { x: 80, y: 300 })
    await expect(
      page
        .locator(
          '[data-routine-weekday="wednesday"] .routine-builder-schedule-block',
        )
        .filter({ hasText: "TypeScript" }),
    ).toHaveCount(1)
    await page
      .locator('[aria-label="Desfazer última alteração"]:visible')
      .click()
    await expect(
      page
        .locator(
          '[data-routine-weekday="tuesday"] .routine-builder-schedule-block',
        )
        .filter({ hasText: "TypeScript" }),
    ).toHaveCount(1)
  })

  test("limpa o histórico após salvar", async ({ page }) => {
    await openBuilder(page)
    await addDesktopBlock(page)
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect(
      page.locator('[aria-label="Desfazer última alteração"]:visible'),
    ).toBeDisabled()
    await expect(
      page.locator('[aria-label="Refazer alteração"]:visible'),
    ).toBeDisabled()
  })

  test("arrasta bloco existente dentro da timeline", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    const block = page
      .locator(".routine-builder-schedule-block")
      .filter({ hasText: "TypeScript" })
    const lane = page.locator(
      '[data-routine-day-lane="true"][data-routine-weekday="wednesday"]',
    )
    await dragHtml5(page, block, lane, { x: 80, y: 260 })
    await expect(
      page
        .locator(
          '[data-routine-weekday="wednesday"] .routine-builder-schedule-block',
        )
        .filter({ hasText: "TypeScript" }),
    ).toHaveCount(1)
  })

  test("soltar fora da timeline não altera a posição", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    const block = page
      .locator(".routine-builder-schedule-block")
      .filter({ hasText: "TypeScript" })
    const before = await block.getAttribute("data-routine-block-start-time")
    await block.dragTo(page.getByRole("heading", { name: /Julho 2026/ }))
    await expect(block).toHaveAttribute(
      "data-routine-block-start-time",
      before ?? "",
    )
    await expect(
      page
        .locator(
          '[data-routine-weekday="tuesday"] .routine-builder-schedule-block',
        )
        .filter({ hasText: "TypeScript" }),
    ).toHaveCount(1)
  })

  test("arrasta um bloco do menu para a timeline", async ({ page }) => {
    await openBuilder(page)
    await page.getByLabel("Painel de blocos").hover()
    const paletteBlock = page.getByRole("button", { name: /^Tarefa/ })
    const lane = page.locator(
      '[data-routine-day-lane="true"][data-routine-weekday="tuesday"]',
    )
    await dragHtml5(page, paletteBlock, lane, { x: 80, y: 240 })
    await expect(desktopBlocks(page)).toHaveCount(1)
  })

  test("drag preserva precisão de horário em minutos", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    const block = page
      .locator(".routine-builder-schedule-block")
      .filter({ hasText: "TypeScript" })
    const lane = page.locator(
      '[data-routine-day-lane="true"][data-routine-weekday="wednesday"]',
    )
    await dragHtml5(page, block, lane, { x: 70, y: 317 })
    const time = await page
      .locator(
        '[data-routine-weekday="wednesday"] .routine-builder-schedule-block',
      )
      .filter({ hasText: "TypeScript" })
      .getAttribute("data-routine-block-start-time")
    expect(time).toMatch(/^\d{2}:\d{2}$/)
    expect(time).not.toBe("10:00")
  })

  test("identifica conflito entre blocos", async ({ page }) => {
    await preparePage(page, { routine: conflictingRoutine })
    await page.goto("/")
    await page
      .getByRole("button", { name: "Montar rotina", exact: true })
      .click()
    await expect(page.getByText(/conflito/i).first()).toBeVisible()
  })

  test("cria recorrência mantendo uma série identificável", async ({
    page,
  }) => {
    await openBuilder(page, { withRoutine: true })
    await openFirstBlockActions(page)
    await clickBuilderMenuAction(page, "Editar")
    await page.getByLabel("Repetir tarefa").selectOption("week-daily")
    await page.getByRole("button", { name: "Salvar bloco" }).click()
    await expect(desktopBlocks(page)).toHaveCount(8)
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    const stored = JSON.parse((await readStoredRoutine(page)) ?? "{}")
    const repeated = stored.weeks.flatMap(
      (week: { days: Array<{ blocks: unknown[] }> }) =>
        week.days.flatMap((day) => day.blocks),
    )
    expect(
      repeated.filter(
        (block: { repeatSourceId?: string }) => block.repeatSourceId,
      ),
    ).toHaveLength(7)
  })

  test("exclui apenas uma ocorrência recorrente", async ({ page }) => {
    await preparePage(page, { routine: createRecurringRoutine() })
    await page.goto("/")
    await page
      .getByRole("button", { name: "Montar rotina", exact: true })
      .click()
    await openFirstBlockActions(page)
    await clickBuilderMenuAction(page, "Excluir")
    await page.getByRole("button", { name: "Apenas esta tarefa" }).click()
    await expect(
      desktopBlocks(page).filter({ hasText: "Recorrente E2E" }),
    ).toHaveCount(1)
  })

  test("exclui todas as ocorrências recorrentes", async ({ page }) => {
    await preparePage(page, { routine: createRecurringRoutine() })
    await page.goto("/")
    await page
      .getByRole("button", { name: "Montar rotina", exact: true })
      .click()
    await openFirstBlockActions(page)
    await clickBuilderMenuAction(page, "Excluir")
    await page.getByRole("button", { name: "Todas as repetições" }).click()
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    expect(await readStoredRoutine(page)).not.toContain("serie-e2e")
  })
})

function createRecurringRoutine() {
  return {
    ...filledRoutine,
    days: filledRoutine.days.map((day) => ({ ...day, blocks: [] })),
    weeks: [
      {
        id: "week-2026-07-12",
        weekStartDate: "2026-07-12",
        days: filledRoutine.days.map((day) => ({
          ...day,
          isActive: day.weekday === "tuesday" || day.weekday === "wednesday",
          blocks:
            day.weekday === "tuesday" || day.weekday === "wednesday"
              ? [
                  {
                    ...filledRoutine.days[0].blocks[0],
                    id: `recorrente-${day.weekday}`,
                    repeatSourceId: "serie-e2e",
                    title: "Recorrente E2E",
                  },
                ]
              : [],
        })),
      },
    ],
  }
}
