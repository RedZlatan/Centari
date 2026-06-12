import type { Metadata } from "next";
import { getDisplaySignals, getTopTrends, getDatasetUpdatedAt } from "@/lib/signals";
import { SignalMapPage } from "@/components/research/SignalMapPage";

export const metadata: Metadata = {
  title: "Research Signal Map · Centari",
  description:
    "Live technology signals across AI, XR, robotics, quantum, space, energy, and materials.",
};

export default function ResearchPage() {
  const signals = getDisplaySignals();
  const trendsData = getTopTrends();
  const updatedAt = getDatasetUpdatedAt();

  return (
    <SignalMapPage
      signals={signals}
      trends={trendsData.trends}
      updatedAt={updatedAt}
    />
  );
}
