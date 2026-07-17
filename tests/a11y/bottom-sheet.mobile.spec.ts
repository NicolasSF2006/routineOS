import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { filledRoutine, preparePage } from "../helpers/browser-state"

test("@a11y bottom sheet mobile", async ({ page }) => {
  await preparePage(page, {
    routine: filledRoutine,
    view: "configurar-rotina",
  })
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Configurar rotina" }),
  ).toBeVisible()

  await page.getByLabel("Adicionar bloco").click()
  await expect(
    page.getByRole("dialog", { name: "Adicionar bloco" }),
  ).toBeVisible()

  const results = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze()
  expect(results.violations).toEqual([])
})
