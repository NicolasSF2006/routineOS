import { test } from "@playwright/test"
import { filledRoutine } from "../helpers/browser-state"
import { openStablePage, screenshot } from "./visual-helpers"

test("@visual bottom sheet mobile aberto", async ({ page }) => {
  await openStablePage(page, {
    routine: filledRoutine,
    view: "configurar-rotina",
  })
  await page.getByLabel("Adicionar bloco").click()
  await screenshot(page, "routine-bottom-sheet.png")
})

test("@visual menu mobile aberto", async ({ page }) => {
  await openStablePage(page, { routine: filledRoutine })
  await page.getByLabel("Abrir menu").click()
  await screenshot(page, "mobile-menu-open.png")
})

test("@visual rotina mobile em dias diferentes", async ({ page }) => {
  await openStablePage(page, {
    routine: filledRoutine,
    view: "configurar-rotina",
  })
  const container = page.locator('[data-mobile-swipe-container="true"]')
  const box = await container.boundingBox()
  if (!box) throw new Error("Timeline mobile não encontrada.")
  await page.mouse.move(box.x + 320, box.y + 180)
  await page.mouse.down()
  await page.mouse.move(box.x + 70, box.y + 184, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  await screenshot(page, "routine-mobile-next-day.png")
})
