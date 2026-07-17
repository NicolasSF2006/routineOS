import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { StudySettingsProvider } from "@/hooks/use-study-settings"
import "@/styles/globals.css"

export const metadata: Metadata = {
  title: {
    default: "RoutineOS — Rotina de estudos",
    template: "%s | RoutineOS",
  },
  description:
    "Organize sua rotina de estudos, acompanhe seu progresso e mantenha seus dados protegidos com backup local.",
  applicationName: "RoutineOS",
  authors: [{ name: "Nicolas Silva Frazão" }],
  creator: "Nicolas Silva Frazão",
  openGraph: {
    title: "RoutineOS",
    description:
      "Aplicação web para organização de rotinas de estudo, acompanhamento de progresso e backup local.",
    url: "https://routineos-app.vercel.app/",
    siteName: "RoutineOS",
    type: "website",
    locale: "pt_BR",
  },
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1f2b" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="bg-background">
      <body className="font-sans antialiased">
        <ThemeProvider>
          <StudySettingsProvider>{children}</StudySettingsProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
