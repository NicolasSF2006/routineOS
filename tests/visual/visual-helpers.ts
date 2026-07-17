import { expect, type Page } from "@playwright/test"
import { disableVisualMotion, preparePage } from "../helpers/browser-state"

export async function openStablePage(
  page: Page,
  options: Parameters<typeof preparePage>[1] = {},
) {
  await preparePage(page, options)
  await page.goto("/")
  await disableVisualMotion(page)
}

export async function screenshot(page: Page, name: string) {
  await expect(page).toHaveScreenshot(name, { fullPage: true })
}

export async function openBlockMenu(page: Page) {
  await page
    .getByLabel("Abrir ações do bloco")
    .first()
    .evaluate((button) => (button as HTMLElement).click())
}

export async function openMentor(page: Page) {
  if (await page.getByLabel("Abrir Mentor IA").isVisible()) {
    await page.getByLabel("Abrir Mentor IA").click()
  } else {
    await page.getByLabel("Abrir menu").click()
    await page.getByRole("button", { name: "Mentor IA" }).click()
  }
}

export async function seedMentorMessage(page: Page, value: unknown) {
  await page.addInitScript((message) => {
    localStorage.setItem("routineos-mentor-chat", JSON.stringify([message]))
  }, value)
}
