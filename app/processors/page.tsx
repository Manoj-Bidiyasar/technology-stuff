import type { Metadata } from "next";
import ProcessorsLandingClient from "@/components/ProcessorsLandingClient";
import { listProcessorDetailsBySlug } from "@/lib/processors/details";
import { listProcessorProfiles } from "@/lib/processors/profiles";
import { calculateAiScore, calculateAiScoreReferences, calculateEfficiencyScore, calculateGamingScore, calculateGamingScoreReferences, calculatePerformanceScore, calculatePerformanceScoreReferences, calculateTotalScore } from "@/lib/processors/scoring";

export const metadata: Metadata = {
  title: "Processors",
  description: "Explore smartphone processors with benchmarks, node size, clocks, device score, and quick compare tools.",
};

export default async function ProcessorsPage() {
  const [processors, allDetailsBySlug] = await Promise.all([
    listProcessorProfiles(),
    listProcessorDetailsBySlug(),
  ]);

  const gamingReferences = calculateGamingScoreReferences(Object.values(allDetailsBySlug));
  const aiReferences = calculateAiScoreReferences(Object.values(allDetailsBySlug));
  const performanceReferences = calculatePerformanceScoreReferences(
    Object.values(allDetailsBySlug),
    processors.map((item) => Number(item.antutu || 0)),
    processors.map((item) => Number(item.maxCpuGhz || 0))
  );

  const enriched = processors.map((p) => {
    const detail = allDetailsBySlug[p.slug];
    const perf = calculatePerformanceScore({
      processorName: p.name,
      antutuScore: detail?.benchmarks?.antutuCalc,
      antutuFallbackScore: detail?.benchmarks?.antutu || p.antutu,
      geekbenchSingle: detail?.benchmarks?.geekbenchSingle,
      geekbenchMulti: detail?.benchmarks?.geekbenchMulti,
      maxCpuGhz: p.maxCpuGhz,
      fabricationNm: p.fabricationNm,
      process: p.process || detail?.process,
      instructionSet: detail?.instructionSet,
      architectureBits: detail?.architectureBits,
      coreConfiguration: detail?.coreConfiguration,
      cores: detail?.cores,
      memoryType: detail?.memoryType,
      memoryTypes: detail?.memoryTypes,
      memoryFreqMhz: detail?.memoryFreqMhz,
      memoryFreqByType: detail?.memoryFreqByType,
      memoryBusWidthBits: detail?.memoryBusWidthBits,
      totalRamBusWidthBits: detail?.totalRamBusWidthBits,
      storageType: detail?.storageType,
      storageTypes: detail?.storageTypes,
    }, performanceReferences).score;

    const eff = calculateEfficiencyScore({
      fabricationNm: p.fabricationNm,
      process: p.process || detail?.process,
      instructionSet: detail?.instructionSet,
      architectureBits: detail?.architectureBits,
      coreConfiguration: detail?.coreConfiguration,
      cores: detail?.cores,
    });

    const game = calculateGamingScore({
      fabricationNm: p.fabricationNm,
      process: p.process || detail?.process,
      instructionSet: detail?.instructionSet,
      architectureBits: detail?.architectureBits,
      coreConfiguration: detail?.coreConfiguration,
      cores: detail?.cores,
      memoryType: detail?.memoryType,
      memoryTypes: detail?.memoryTypes,
      memoryFreqMhz: detail?.memoryFreqMhz,
      memoryFreqByType: detail?.memoryFreqByType,
      memoryBusWidthBits: detail?.memoryBusWidthBits,
      totalRamBusWidthBits: detail?.totalRamBusWidthBits,
      storageType: detail?.storageType,
      storageTypes: detail?.storageTypes,
      gpuFlops: detail?.gpuFlops,
      wildLifeScore: detail?.benchmarks?.threeDMarkWildLife,
      antutu11GpuScore: detail?.benchmarks?.antutuCalcGpu,
    }, gamingReferences).score;

    const ai = calculateAiScore({
      processorName: p.name,
      aiBenchmarkScore: detail?.benchmarks?.aiScore,
      fabricationNm: p.fabricationNm,
      process: p.process || detail?.process,
      instructionSet: detail?.instructionSet,
      architectureBits: detail?.architectureBits,
      coreConfiguration: detail?.coreConfiguration,
      cores: detail?.cores,
      memoryType: detail?.memoryType,
      memoryTypes: detail?.memoryTypes,
      memoryFreqMhz: detail?.memoryFreqMhz,
      memoryFreqByType: detail?.memoryFreqByType,
      memoryBusWidthBits: detail?.memoryBusWidthBits,
      totalRamBusWidthBits: detail?.totalRamBusWidthBits,
      storageType: detail?.storageType,
      storageTypes: detail?.storageTypes,
    }, aiReferences).score;

    return {
      ...p,
      totalScore: calculateTotalScore({
        performance: perf,
        gaming: game,
        efficiency: eff,
        ai,
      }),
    };
  });

  return <ProcessorsLandingClient processors={enriched} />;
}
