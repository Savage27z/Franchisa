"use client";

import { motion } from "framer-motion";
import { MeetingCard } from "@/components/meeting-card";
import { StatsBar } from "@/components/stats-bar";
import { MOCK_MEETINGS } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <p className="text-sm text-muted-foreground mb-2">Governance</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Active Meetings
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mb-8"
      >
        <StatsBar />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_MEETINGS.map((meeting, i) => (
          <MeetingCard key={meeting.ticker} meeting={meeting} index={i} />
        ))}
      </div>
    </div>
  );
}
