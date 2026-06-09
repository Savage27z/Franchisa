"use client";

import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

function RainbowKitThemeWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const rkTheme = mounted && resolvedTheme === "light"
    ? lightTheme({
        accentColor: "#6d28d9",
        accentColorForeground: "white",
        borderRadius: "large",
      })
    : darkTheme({
        accentColor: "#7c3aed",
        accentColorForeground: "white",
        borderRadius: "large",
        overlayBlur: "small",
      });

  return (
    <RainbowKitProvider theme={rkTheme} modalSize="compact">
      {children}
    </RainbowKitProvider>
  );
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitThemeWrapper>
          {children}
        </RainbowKitThemeWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
