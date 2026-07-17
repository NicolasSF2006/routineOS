import { expect, test, type Page, type Route } from "@playwright/test"
import { mentorRoutineProposal } from "../fixtures/mentor"
import { filledRoutine, preparePage } from "../helpers/browser-state"

type MentorReply = {
  reply: string
  provider?: string
  action?: {
    type: "preview-routine" | "propose-routine"
    routine: typeof mentorRoutineProposal
  }
}

async function openMentor(page: Page, withRoutine = false) {
  await preparePage(page, { routine: withRoutine ? filledRoutine : undefined })
  await page.goto("/")
  await page.getByLabel("Abrir Mentor IA").click()
  await expect(page.getByLabel("Painel do Mentor IA")).toBeVisible()
}

async function sendMessage(page: Page, message: string) {
  await page.getByLabel("Mensagem para o Mentor IA").fill(message)
  await page.getByRole("button", { name: "Enviar" }).click()
}

async function mockReply(
  page: Page,
  reply: MentorReply | ((route: Route) => void),
) {
  await page.route("**/api/mentor", async (route) => {
    if (typeof reply === "function") return reply(route)
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(reply),
    })
  })
}

test.describe("Mentor IA com API determinística", () => {
  test("cria uma rotina pelo Mentor sem acessar a internet", async ({
    page,
  }) => {
    await mockReply(page, {
      reply: "Prévia pronta.",
      action: { type: "preview-routine", routine: mentorRoutineProposal },
    })
    await openMentor(page)
    await sendMessage(page, "Monte uma rotina de TypeScript")
    await expect(page.getByText("Rotina de tecnologia")).toBeVisible()
  })

  test("envia ao Mentor as informações coletadas do contexto", async ({
    page,
  }) => {
    let received: Record<string, unknown> | undefined
    await mockReply(page, async (route) => {
      received = route.request().postDataJSON() as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Contexto recebido." }),
      })
    })
    await openMentor(page, true)
    await sendMessage(page, "Analise minha semana")
    await expect(page.getByText("Contexto recebido.")).toBeVisible()
    expect(received?.message).toBe("Analise minha semana")
    expect(received?.context).toEqual(
      expect.objectContaining({
        currentView: "rotina",
        activeRoutine: expect.any(Object),
      }),
    )
  })

  test("exibe a prévia validada antes da confirmação", async ({ page }) => {
    await mockReply(page, {
      reply: "Revise a proposta.",
      action: { type: "preview-routine", routine: mentorRoutineProposal },
    })
    await openMentor(page)
    await sendMessage(page, "Quero uma prévia")
    await expect(page.getByText(/Esta é uma prévia validada/)).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Abrir rascunho/ }),
    ).toHaveCount(0)
  })

  test("confirma a frase Pode criar a rotina", async ({ page }) => {
    let message = ""
    await mockReply(page, async (route) => {
      message = (route.request().postDataJSON() as { message: string }).message
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reply: "Rotina confirmada.",
          action: { type: "propose-routine", routine: mentorRoutineProposal },
        }),
      })
    })
    await openMentor(page)
    await sendMessage(page, "Pode criar a rotina")
    await expect(
      page.getByRole("button", { name: /Abrir rascunho/ }),
    ).toBeVisible()
    expect(message).toBe("Pode criar a rotina")
  })

  test("aplica a proposta somente como rascunho", async ({ page }) => {
    await mockReply(page, {
      reply: "Pronto.",
      action: { type: "propose-routine", routine: mentorRoutineProposal },
    })
    await openMentor(page, true)
    const before = await page.evaluate(() =>
      localStorage.getItem("routineos-active-routine"),
    )
    await sendMessage(page, "Pode criar a rotina")
    await page.getByRole("button", { name: /Abrir rascunho/ }).click()
    await expect(
      page.getByRole("heading", { name: "Configurar rotina" }),
    ).toBeVisible()
    expect(
      await page.evaluate(() =>
        localStorage.getItem("routineos-active-routine"),
      ),
    ).toBe(before)
    await expect(
      page.getByRole("button", { name: "Salvar", exact: true }),
    ).toBeEnabled()
  })

  test("salva o rascunho aprovado do Mentor", async ({ page }) => {
    await mockReply(page, {
      reply: "Pronto.",
      action: { type: "propose-routine", routine: mentorRoutineProposal },
    })
    await openMentor(page, true)
    await sendMessage(page, "Pode criar a rotina")
    await page.getByRole("button", { name: /Abrir rascunho/ }).click()
    await page.getByRole("button", { name: "Salvar", exact: true }).click()
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("routineos-active-routine")),
      )
      .toContain("Rotina de tecnologia")
  })

  test("mantém Markdown seguro na resposta", async ({ page }) => {
    await mockReply(page, {
      reply: "## Plano\n\n- **Estudar** tipos\n- Praticar",
    })
    await openMentor(page)
    await sendMessage(page, "Mostre meu plano")
    await expect(page.getByRole("heading", { name: "Plano" })).toBeVisible()
    await expect(page.getByText("Estudar")).toBeVisible()
  })

  test("executa o comando /provedores", async ({ page }) => {
    await mockReply(page, { reply: "Gemini: disponível\n\nGroq: sem chave" })
    await openMentor(page)
    await sendMessage(page, "/provedores")
    await expect(page.getByText("Gemini: disponível")).toBeVisible()
    await expect(page.getByText("Groq: sem chave")).toBeVisible()
  })

  test("aceita resposta do fallback mockado", async ({ page }) => {
    await mockReply(page, {
      reply: "Resposta determinística via Groq.",
      provider: "groq",
    })
    await openMentor(page)
    await sendMessage(page, "Use o provedor disponível")
    await expect(
      page.getByText("Resposta determinística via Groq."),
    ).toBeVisible()
  })

  test("trata provedor sem chave sem expor segredo", async ({ page }) => {
    await page.route("**/api/mentor", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "O provedor selecionado não possui chave configurada.",
        }),
      }),
    )
    await openMentor(page)
    await sendMessage(page, "Teste")
    await expect(
      page.getByText("O provedor selecionado não possui chave configurada."),
    ).toBeVisible()
  })

  test("trata todos os provedores indisponíveis", async ({ page }) => {
    await page.route("**/api/mentor", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Nenhum provedor de IA está disponível agora.",
        }),
      }),
    )
    await openMentor(page)
    await sendMessage(page, "Teste")
    await expect(
      page.getByText("Nenhum provedor de IA está disponível agora."),
    ).toBeVisible()
  })

  test("mostra carregamento enquanto a resposta está pendente", async ({
    page,
  }) => {
    let release: (() => void) | undefined
    await mockReply(page, async (route) => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Finalizado." }),
      })
    })
    await openMentor(page)
    await sendMessage(page, "Aguarde")
    await expect(page.getByText("Mentor está pensando...")).toBeVisible()
    release?.()
    await expect(page.getByText("Finalizado.")).toBeVisible()
  })
})
