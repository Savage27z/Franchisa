"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function ConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <LiquidButton
                    onClick={openConnectModal}
                    size="default"
                    className="text-sm"
                  >
                    <Wallet className="h-4 w-4 mr-1.5" />
                    Connect Wallet
                  </LiquidButton>
                );
              }

              if (chain.unsupported) {
                return (
                  <LiquidButton
                    onClick={openChainModal}
                    size="default"
                    className="text-sm text-red-400"
                  >
                    Wrong Network
                  </LiquidButton>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-xs text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        alt={chain.name ?? "Chain"}
                        src={chain.iconUrl}
                        className="h-4 w-4 rounded-full"
                      />
                    )}
                  </button>

                  <LiquidButton
                    onClick={openAccountModal}
                    size="default"
                    className="text-sm"
                  >
                    <span className="font-mono text-xs">
                      {account.displayName}
                    </span>
                    <ChevronDown className="h-3 w-3 ml-0.5 opacity-50" />
                  </LiquidButton>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
