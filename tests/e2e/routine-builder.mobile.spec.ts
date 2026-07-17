import { expect, test, type Page } from "@playwright/test"
import { filledRoutine, preparePage } from "../helpers/browser-state"
import { dispatchPointerSequence, openBuilder } from "./helpers"

async function swipe(page: Page, direction: "next" | "previous") {
  const container = page.locator('[data-mobile-swipe-container="true"]')
  await dispatchPointerSequence(
    page,
    container,
    direction === "next"
      ? [
          { x: 320, y: 180 },
          { x: 210, y: 182 },
          { x: 70, y: 184 },
        ]
      : [
          { x: 70, y: 180 },
          { x: 190, y: 182 },
          { x: 330, y: 184 },
        ],
  )
  await page.waitForTimeout(400)
}

test.describe("gestos do construtor no mobile", () => {
  test("swipe avança para o próximo dia", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    await expect(page.getByText("Terça, 14")).toBeVisible()
    await swipe(page, "next")
    await expect(page.getByText("Quarta, 15")).toBeVisible()
  })

  test("swipe volta para o dia anterior", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    await swipe(page, "previous")
    await expect(page.getByText("Segunda, 13")).toBeVisible()
  })

  test("scroll vertical não troca o dia", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    const timeline = page
      .locator(".touch-pan-y")
      .filter({ has: page.getByText("TypeScript") })
    await timeline.hover()
    await page.mouse.wheel(0, 500)
    await expect(page.getByText("Terça, 14")).toBeVisible()
  })

  test("drag de bloco não aciona swipe", async ({ page }) => {
    await openBuilder(page, { withRoutine: true })
    const block = page
      .locator("[data-routine-block-start-time]:visible")
      .filter({ hasText: "TypeScript" })
    const box = await block.boundingBox()
    if (!box) throw new Error("Bloco mobile não encontrado.")
    const before = await block.getAttribute("data-routine-block-start-time")
    await page.mouse.move(box.x + 40, box.y + 25)
    await page.mouse.down()
    await page.waitForTimeout(280)
    await page.mouse.move(box.x + 40, box.y + 160, { steps: 10 })
    await page.mouse.up()
    await expect(page.getByText("Terça, 14")).toBeVisible()
    await expect(block).not.toHaveAttribute(
      "data-routine-block-start-time",
      before ?? "",
    )
  })

  test("abre o bottom sheet de blocos", async ({ page }) => {
    await openBuilder(page)
    await page.getByLabel("Adicionar bloco").click()
    await expect(
      page.getByRole("dialog", { name: "Adicionar bloco" }),
    ).toBeVisible()
  })

  test("fecha o bottom sheet clicando fora", async ({ page }) => {
    await openBuilder(page)
    await page.getByLabel("Adicionar bloco").click()
    await page
      .getByLabel("Fechar menu de blocos")
      .click({ position: { x: 20, y: 20 } })
    await expect(
      page.getByRole("dialog", { name: "Adicionar bloco" }),
    ).toBeHidden()
  })

  test("fecha o bottom sheet arrastando para baixo", async ({ page }) => {
    await openBuilder(page)
    await page.getByLabel("Adicionar bloco").click()
    const sheet = page.locator('[data-mobile-block-picker-sheet="true"]')
    await expect(sheet).toBeVisible()
    await page.waitForTimeout(350)
    const box = await sheet.boundingBox()
    if (!box) throw new Error("Bottom sheet não encontrado.")
    await dispatchPointerSequence(
      page,
      sheet,
      [
        { x: box.width / 2, y: 20 },
        { x: box.width / 2, y: 150 },
        { x: box.width / 2, y: 300 },
      ],
      { delayMs: 70 },
    )
    await expect(
      page.getByRole("dialog", { name: "Adicionar bloco" }),
    ).toBeHidden()
  })

  test("bloqueia scroll do fundo com o bottom sheet aberto", async ({
    page,
  }) => {
    await openBuilder(page)
    await page.getByLabel("Adicionar bloco").click()
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    )
    await page
      .getByLabel("Fechar menu de blocos")
      .click({ position: { x: 20, y: 20 } })
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("")
  })

  test("arrasta um bloco do sheet para a timeline", async ({ page }) => {
    await openBuilder(page)
    await page.getByLabel("Adicionar bloco").click()
    const dialog = page.getByRole("dialog", { name: "Adicionar bloco" })
    await expect(dialog).toBeVisible()
    await page.waitForTimeout(350)
    const palette = page.getByRole("button", { name: /^Tarefa/ })
    const paletteBox = await palette.boundingBox()
    const lane = page.locator('[data-mobile-current-day="true"]')
    if (!paletteBox) throw new Error("Bloco do menu não encontrado.")
    const startX = paletteBox.x + paletteBox.width / 2
    const startY = paletteBox.y + paletteBox.height / 2
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY }],
    })
    await page.waitForTimeout(350)
    await expect(
      page.locator('[data-mobile-palette-drag-preview="true"]'),
    ).toBeVisible()
    const laneBox = await lane.boundingBox()
    if (!laneBox) throw new Error("Timeline mobile não encontrada.")
    const targetX = laneBox.x + laneBox.width / 2
    const targetY = laneBox.y + 260
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: targetX, y: targetY }],
    })
    await page.waitForTimeout(100)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    })
    await cdp.detach()
    await expect(
      page.locator("[data-routine-block-start-time]:visible"),
    ).toHaveCount(1)
  })

  test("mantém Mentor fora da área fixa no mobile", async ({ page }) => {
    await preparePage(page, { routine: filledRoutine })
    await page.goto("/")
    await expect(page.getByLabel("Abrir Mentor IA")).toBeHidden()
  })

  test("abre e fecha o menu mobile", async ({ page }) => {
    await preparePage(page, { routine: filledRoutine })
    await page.goto("/")
    await page.getByLabel("Abrir menu").click()
    await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("heading", { name: "Menu" })).toBeHidden()
  })

  test("abre o Mentor pelo menu mobile", async ({ page }) => {
    await preparePage(page, { routine: filledRoutine })
    await page.goto("/")
    await page.getByLabel("Abrir menu").click()
    await page.getByRole("button", { name: "Mentor IA" }).click()
    await expect(page.getByLabel("Painel do Mentor IA")).toBeVisible()
  })
})
