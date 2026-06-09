"use client";

import { BarChart3, Shield, User, ChevronLeft, Droplets } from "lucide-react";
import Link from "next/link";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const navItems = [
  { name: "Dashboard", url: "/dashboard", icon: BarChart3 },
  { name: "Proof", url: "/proof", icon: Shield },
  { name: "Faucet", url: "/faucet", icon: Droplets },
  { name: "Profile", url: "/profile", icon: User },
];

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-5xl px-6 pt-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group mt-1"
          >
            <ChevronLeft className="mr-0.5 opacity-60 group-hover:opacity-100 transition-opacity" size={16} strokeWidth={2} aria-hidden="true" />
            Home
          </Link>
          <NavBar items={navItems} className="static translate-x-0 left-auto mb-0 sm:pt-0" />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <ThemeToggle />
          <ConnectButton
            chainStatus="icon"
            accountStatus="address"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
