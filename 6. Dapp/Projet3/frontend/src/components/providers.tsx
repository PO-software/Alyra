"use client"

import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { type ReactNode, useState } from "react"
import { WagmiProvider } from "wagmi"

import { Toaster } from "@/components/ui/sonner"
import { createWagmiConfig } from "@/config/wagmi"

const rainbowTheme = {
  lightMode: lightTheme({ accentColor: "#047857", borderRadius: "medium" }),
  darkMode: darkTheme({ accentColor: "#10b981", accentColorForeground: "#0a0a0a", borderRadius: "medium" }),
}

export function Providers({ children }: { children: ReactNode }) {
  const [wagmiConfig] = useState(createWagmiConfig)
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider locale="fr-FR" theme={rainbowTheme}>
            {children}
            <Toaster richColors closeButton />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}
