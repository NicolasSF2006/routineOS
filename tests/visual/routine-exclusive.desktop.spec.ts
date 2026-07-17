import { test } from "@playwright/test"
import { filledRoutine } from "../helpers/browser-state"
import { openStablePage, screenshot } from "./visual-helpers"

test("@visual menu lateral de blocos no desktop", async ({ page }) => {
  await openStablePage(page, {
    routine: filledRoutine,
    view: "configurar-rotina",
  })
  await page.getByLabel("Painel de blocos").hover()
  await screenshot(page, "routine-block-palette.png")
})
