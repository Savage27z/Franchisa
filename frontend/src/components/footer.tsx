"use client";

export function Footer() {
  return (
    <footer className="py-8 px-6 mt-auto border-t border-border">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          Franchisa — Corporate Governance On-Chain
        </span>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground/60">
          <span>Arbitrum</span>
          <span>Stylus + Solidity</span>
          <span>AI-Powered</span>
        </div>
      </div>
    </footer>
  );
}
