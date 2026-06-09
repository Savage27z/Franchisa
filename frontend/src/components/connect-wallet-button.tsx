"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Wallet, ChevronDown } from "lucide-react";

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
                    size="sm"
                    className="text-xs h-8 px-3 rounded-lg"
                  >
                    <Wallet className="h-3.5 w-3.5 mr-1" />
                    Connect
                  </LiquidButton>
                );
              }

              if (chain.unsupported) {
                return (
                  <LiquidButton
                    onClick={openChainModal}
                    size="sm"
                    className="text-xs h-8 px-3 rounded-lg text-red-400"
                  >
                    Wrong Network
                  </LiquidButton>
                );
              }

              return (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={openChainModal}
                    className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 hover:bg-muted dark:hover:bg-white/10 transition-colors cursor-pointer"
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
                    size="sm"
                    className="text-xs h-8 px-3 rounded-lg"
                  >
                    <span className="font-mono text-[11px]">
                      {account.displayName}
                    </span>
                    <ChevronDown className="h-3 w-3 ml-0.5 opacity-40" />
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
