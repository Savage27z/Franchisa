"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import type { Meeting } from "@/lib/mock-data";

const cardThemes = [
  {
    gradientColors: { primary: "#0a1628", secondary: "#1e40af", accent: "#60a5fa" },
    backgroundColor: "#0f172a",
  },
  {
    gradientColors: { primary: "#14142b", secondary: "#6d28d9", accent: "#a78bfa" },
    backgroundColor: "#0f0f1e",
  },
  {
    gradientColors: { primary: "#0a1a14", secondary: "#059669", accent: "#6ee7b7" },
    backgroundColor: "#0f1f17",
  },
];

export function MeetingCard({
  meeting,
  index,
}: {
  meeting: Meeting;
  index: number;
}) {
  const daysLeft = Math.ceil(
    (new Date(meeting.meetingDate).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );

  const theme = cardThemes[index % cardThemes.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Link href={`/dashboard/${meeting.ticker.toLowerCase()}`}>
        <BorderRotate
          animationMode="rotate-on-hover"
          animationSpeed={3}
          gradientColors={theme.gradientColors}
          backgroundColor={theme.backgroundColor}
          borderWidth={1}
          borderRadius={16}
          className="group p-6 cursor-pointer hover:scale-[1.01] transition-transform duration-300"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold tracking-tight mb-0.5 text-white">
                {meeting.ticker}
              </h3>
              <p className="text-sm text-white/50">
                {meeting.companyName}
              </p>
            </div>
            <Badge className="text-[11px] font-medium rounded-full bg-white/10 text-white/70 border-white/10 hover:bg-white/10">
              {meeting.isActive ? "Active" : "Closed"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">
                Meeting
              </p>
              <p className="text-sm font-medium text-white/80">
                {new Date(meeting.meetingDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">
                Proposals
              </p>
              <p className="text-sm font-medium text-white/80">{meeting.proposalCount}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">
                Voters
              </p>
              <p className="text-sm font-medium text-white/80">
                {meeting.totalVoters.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-xs text-white/40">
              {daysLeft > 0 ? `${daysLeft}d remaining` : "Concluded"}
            </span>
            <ArrowUpRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors duration-200" />
          </div>
        </BorderRotate>
      </Link>
    </motion.div>
  );
}
