import type { Metadata } from "next";
import ProcessorCompareClient from "@/components/ProcessorCompareClient";
import { listProcessorProfiles } from "@/lib/processors/profiles";

export const metadata: Metadata = {
  title: "Processor Comparison",
  description: "Compare smartphone processors by benchmark, process node, CPU clock, and practical device scores.",
};

export default async function ProcessorsPage() {
  const processors = await listProcessorProfiles();
  return <ProcessorCompareClient processors={processors} />;
}

