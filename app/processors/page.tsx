import type { Metadata } from "next";
import ProcessorsLandingClient from "@/components/ProcessorsLandingClient";
import { listProcessorProfiles } from "@/lib/processors/profiles";

export const metadata: Metadata = {
  title: "Processors",
  description: "Explore smartphone processors with benchmarks, node size, clocks, device score, and quick compare tools.",
};

export default async function ProcessorsPage() {
  const processors = await listProcessorProfiles();
  return <ProcessorsLandingClient processors={processors} />;
}
