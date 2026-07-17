import { expect, type Locator, type Page } from "@playwright/test"
import { filledRoutine, preparePage } from "../helpers/browser-state"

export async function openBuilder(
  page: Page,
  { withRoutine = false }: { withRoutine?: boolean } = {},
): Promise<void> {
  await preparePage(page, {
    routine: withRoutine ? filledRoutine : undefined,
    view: "configurar-rotina",
  })
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /Julho 2026/ })).toBeVisible()
}

export function desktopBlocks(page: Page): Locator {
  return page.locator(".routine-builder-schedule-block")
}

export async function addDesktopBlock(
  page: Page,
  name: RegExp | string = /^Tarefa/,
): Promise<void> {
  await page.getByLabel("Painel de blocos").hover()
  await page.getByRole("button", { name }).click()
  await page.mouse.move(20, 200)
}

export async function clickBuilderMenuAction(
  page: Page,
  name: "Editar" | "Excluir",
): Promise<void> {
  await page
    .getByRole("button", { name, exact: true })
    .evaluate((button) => (button as HTMLElement).click())
}

export async function openFirstBlockActions(page: Page): Promise<void> {
  await page.getByLabel("Abrir ações do bloco").first().click()
}

export async function readStoredRoutine(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem("routineos-active-routine"))
}

export async function dragHtml5(
  page: Page,
  source: Locator,
  target: Locator,
  { x, y }: { x: number; y: number },
): Promise<void> {
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()
  if (!sourceBox || !targetBox) {
    throw new Error("A origem ou o destino do drag não está visível.")
  }

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
  const sourcePosition = {
    clientX: sourceBox.x + sourceBox.width / 2,
    clientY: sourceBox.y + Math.min(sourceBox.height / 2, 16),
    dataTransfer,
  }
  const targetPosition = {
    clientX: targetBox.x + x,
    clientY: targetBox.y + y,
    dataTransfer,
  }

  try {
    await source.dispatchEvent("dragstart", sourcePosition)
    await target.dispatchEvent("dragenter", targetPosition)
    await target.dispatchEvent("dragover", targetPosition)
    await target.dispatchEvent("drop", targetPosition)
    await source.dispatchEvent("dragend", { dataTransfer })
  } finally {
    await dataTransfer.dispose()
  }
}

export async function dispatchPointerSequence(
  page: Page,
  target: Locator,
  points: Array<{ x: number; y: number }>,
  { delayMs = 30 }: { delayMs?: number } = {},
): Promise<void> {
  const box = await target.boundingBox()
  if (!box) throw new Error("O alvo do gesto não está visível.")
  const [first, ...remaining] = points
  await page.mouse.move(box.x + first.x, box.y + first.y)
  await page.mouse.down()
  for (const point of remaining) {
    await page.mouse.move(box.x + point.x, box.y + point.y, { steps: 5 })
    if (delayMs) await page.waitForTimeout(delayMs)
  }
  await page.mouse.up()
}
