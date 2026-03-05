import BatterySpecsTable from "@/components/BatterySpecsTable";
import DesignSection from "@/components/DesignSection";
import DisplaySpecsTable from "@/components/DisplaySpecsTable";
import FrontCameraSection from "@/components/FrontCameraSection";
import GeneralSection from "@/components/GeneralSection";
import NetworkSection from "@/components/NetworkSection";
import PerformanceSection from "@/components/PerformanceSection";
import RearCameraSection from "@/components/RearCameraSection";
import SecurityAndSensorsSection from "@/components/SecurityAndSensorsSection";
import SoftwareSection from "@/components/SoftwareSection";
import StorageSpecsTable from "@/components/StorageSpecsTable";
import { calculateBatteryScore, fallbackBatteryFromProduct } from "@/lib/utils/batteryScore";
import type { DisplayScoreResult } from "@/lib/utils/displayScore";
import { calculateDisplayScore } from "@/lib/utils/displayScore";
import { calculateDesignScore } from "@/lib/utils/designScore";
import { calculateFrontCameraScore, fallbackFrontCameraFromProduct } from "@/lib/utils/frontCameraScore";
import { calculateNetworkScore } from "@/lib/utils/networkScore";
import { calculatePerformanceScore, fallbackPerformanceFromProduct } from "@/lib/utils/performanceScore";
import { calculateRearCameraScore, fallbackRearCameraFromProduct } from "@/lib/utils/rearCameraScore";
import { calculateSecurityAndSensorScore } from "@/lib/utils/securitySensorScore";
import { calculateSoftwareScore } from "@/lib/utils/softwareScore";
import { calculateStorageScore } from "@/lib/utils/storageScore";
import type { MemoryStorage, MemoryVariant, ProductBattery, ProductCamera, ProductDesign, ProductDisplay, ProductDisplayPanel, ProductFrontCamera, ProductGeneral, ProductNetwork, ProductPerformance, ProductRatings, ProductRearCamera, ProductSecurity, ProductSoftware, ProductSpecs } from "@/lib/types/content";
import { fallbackDisplayFromSpecs, toDisplayObject } from "@/lib/utils/display";
import { fallbackMemoryFromProduct } from "@/lib/utils/storage";

type SpecsTableProps = {
  specs: ProductSpecs;
  ratings?: ProductRatings;
  memoryStorage?: MemoryStorage;
  variants?: MemoryVariant[];
  battery?: ProductBattery;
  display?: ProductDisplay;
  displays?: ProductDisplayPanel[];
  performance?: ProductPerformance;
  camera?: ProductCamera;
  frontCamera?: ProductFrontCamera;
  rearCamera?: ProductRearCamera;
  security?: ProductSecurity;
  sensors?: string[];
  network?: ProductNetwork;
  software?: ProductSoftware;
  design?: ProductDesign;
  general?: ProductGeneral;
};

function batteryLabelTag(score: number): { label: string; className: string } {
  if (score >= 8.5) return { label: "Excellent", className: "bg-emerald-50 text-emerald-700" };
  if (score >= 7.5) return { label: "Very Good", className: "bg-blue-50 text-blue-700" };
  if (score >= 6.5) return { label: "Good", className: "bg-amber-50 text-amber-700" };
  if (score >= 5.5) return { label: "Average", className: "bg-slate-100 text-slate-700" };
  return { label: "Poor", className: "bg-rose-50 text-rose-700" };
}

function performanceLabelTag(score: number): { label: string; className: string } {
  if (score >= 9) return { label: "Excellent", className: "bg-emerald-50 text-emerald-700" };
  if (score >= 8) return { label: "Very Good", className: "bg-blue-50 text-blue-700" };
  if (score >= 7) return { label: "Good", className: "bg-amber-50 text-amber-700" };
  if (score >= 6) return { label: "Average", className: "bg-slate-100 text-slate-700" };
  return { label: "Poor", className: "bg-rose-50 text-rose-700" };
}

function displayLabelTag(label: DisplayScoreResult["label"]): { label: string; className: string } {
  if (label === "Excellent") return { label, className: "bg-emerald-50 text-emerald-700" };
  if (label === "Very Good") return { label, className: "bg-blue-50 text-blue-700" };
  if (label === "Good") return { label, className: "bg-amber-50 text-amber-700" };
  if (label === "Average") return { label, className: "bg-slate-100 text-slate-700" };
  return { label, className: "bg-rose-50 text-rose-700" };
}

function frontCameraLabelTag(score: number): { label: string; className: string } {
  if (score >= 8.7) return { label: "Excellent", className: "bg-emerald-50 text-emerald-700" };
  if (score >= 7.8) return { label: "Very Good", className: "bg-blue-50 text-blue-700" };
  if (score >= 6.8) return { label: "Good", className: "bg-amber-50 text-amber-700" };
  if (score >= 5.8) return { label: "Average", className: "bg-slate-100 text-slate-700" };
  return { label: "Poor", className: "bg-rose-50 text-rose-700" };
}

function rearCameraLabelTag(score: number): { label: string; className: string } {
  if (score >= 9) return { label: "Excellent", className: "bg-emerald-50 text-emerald-700" };
  if (score >= 8) return { label: "Very Good", className: "bg-blue-50 text-blue-700" };
  if (score >= 7) return { label: "Good", className: "bg-amber-50 text-amber-700" };
  if (score >= 6) return { label: "Average", className: "bg-slate-100 text-slate-700" };
  return { label: "Poor", className: "bg-rose-50 text-rose-700" };
}

function securitySensorsLabelTag(score: number): { label: string; className: string } {
  if (score >= 9.5) return { label: "Excellent", className: "bg-emerald-50 text-emerald-700" };
  if (score >= 8.5) return { label: "Very Good", className: "bg-blue-50 text-blue-700" };
  if (score >= 7.5) return { label: "Good", className: "bg-amber-50 text-amber-700" };
  if (score >= 6.5) return { label: "Average", className: "bg-slate-100 text-slate-700" };
  return { label: "Poor", className: "bg-rose-50 text-rose-700" };
}

function networkLabelTag(score: number): { label: string; className: string } {
  if (score >= 9) return { label: "Excellent", className: "bg-emerald-50 text-emerald-700" };
  if (score >= 8) return { label: "Very Good", className: "bg-blue-50 text-blue-700" };
  if (score >= 7) return { label: "Good", className: "bg-amber-50 text-amber-700" };
  if (score >= 6) return { label: "Average", className: "bg-slate-100 text-slate-700" };
  return { label: "Poor", className: "bg-rose-50 text-rose-700" };
}

function softwareLabelTag(score: number): { label: string; className: string } {
  if (score >= 9) return { label: "Excellent", className: "bg-emerald-50 text-emerald-700" };
  if (score >= 8) return { label: "Very Good", className: "bg-blue-50 text-blue-700" };
  if (score >= 7) return { label: "Good", className: "bg-amber-50 text-amber-700" };
  if (score >= 6) return { label: "Average", className: "bg-slate-100 text-slate-700" };
  return { label: "Poor", className: "bg-rose-50 text-rose-700" };
}

function designLabelTag(score: number): { label: string; className: string } {
  if (score >= 9) return { label: "Excellent", className: "bg-emerald-50 text-emerald-700" };
  if (score >= 8) return { label: "Very Good", className: "bg-blue-50 text-blue-700" };
  if (score >= 7) return { label: "Good", className: "bg-amber-50 text-amber-700" };
  if (score >= 6) return { label: "Average", className: "bg-slate-100 text-slate-700" };
  return { label: "Poor", className: "bg-rose-50 text-rose-700" };
}

function storageLabelTag(score: number): { label: string; className: string } {
  if (score >= 9) return { label: "Excellent", className: "bg-emerald-50 text-emerald-700" };
  if (score >= 8) return { label: "Very Good", className: "bg-blue-50 text-blue-700" };
  if (score >= 7) return { label: "Good", className: "bg-amber-50 text-amber-700" };
  if (score >= 6) return { label: "Average", className: "bg-slate-100 text-slate-700" };
  return { label: "Poor", className: "bg-rose-50 text-rose-700" };
}

function scoreStrokeColor(score: number): string {
  if (score >= 8.8) return "#059669";
  if (score >= 7.5) return "#2563eb";
  if (score >= 6.5) return "#d97706";
  return "#64748b";
}

function formatScoreValue(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
}

function ScoreCircle({ score }: { score: number }) {
  const normalized = Math.max(0, Math.min(10, score));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = (normalized / 10) * circumference;
  const color = scoreStrokeColor(normalized);

  return (
    <div className="relative h-12 w-12">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-slate-800">
        {formatScoreValue(normalized)}
      </div>
    </div>
  );
}

export default function SpecsTable({ specs, ratings, memoryStorage, variants, battery, display, displays, performance, camera, frontCamera, rearCamera, security, sensors, network, software, design, general }: SpecsTableProps) {
  const effectiveStorage = fallbackMemoryFromProduct({ specs, memoryStorage, variants });
  const storageScore = calculateStorageScore(effectiveStorage);
  const effectiveBattery = fallbackBatteryFromProduct({ specs, battery });
  const batteryScore = calculateBatteryScore(effectiveBattery);
  const effectiveDisplay = toDisplayObject(display || fallbackDisplayFromSpecs(specs));
  const displayScore: DisplayScoreResult = calculateDisplayScore({ display: effectiveDisplay, displays });
  const effectivePerformance = fallbackPerformanceFromProduct({ performance, specs });
  const performanceScore = calculatePerformanceScore({ performance: effectivePerformance }).score;
  const performanceTag = performanceLabelTag(performanceScore);
  const effectiveFrontCamera = fallbackFrontCameraFromProduct({ frontCamera, camera, specs });
  const frontCameraScore = calculateFrontCameraScore({ frontCamera: effectiveFrontCamera }).score;
  const frontCameraTag = frontCameraLabelTag(frontCameraScore);
  const effectiveRearCamera = fallbackRearCameraFromProduct({ rearCamera, camera, specs });
  const rearCameraScore = calculateRearCameraScore({ rearCamera: effectiveRearCamera }).score;
  const rearCameraTag = rearCameraLabelTag(rearCameraScore);
  const securitySensorScore = calculateSecurityAndSensorScore({ security, sensors });
  const securitySensorTag = securitySensorsLabelTag(securitySensorScore.total);
  const networkScore = calculateNetworkScore({ network });
  const networkTag = networkLabelTag(networkScore.score);
  const softwareScore = calculateSoftwareScore({ software });
  const softwareTag = softwareLabelTag(softwareScore.score);
  const designScore = calculateDesignScore({ design });
  const designTag = designLabelTag(designScore.score);

  const sections: Array<{
    title: string;
    score: number;
    noScore?: boolean;
    tag?: { label: string; className: string };
    rows: Array<[string, string | number | undefined]>;
  }> = [
    {
      title: "General",
      score: ratings?.overall || 0,
      noScore: true,
      rows: [],
    },
    {
      title: "Design & Build",
      score: designScore.score,
      tag: designTag,
      rows: [],
    },
    {
      title: "Display",
      score: displayScore.score,
      tag: displayLabelTag(displayScore.label),
      rows: [],
    },
    {
      title: "Performance",
      score: performanceScore,
      tag: performanceTag,
      rows: [],
    },
    {
      title: "Storage",
      score: storageScore.score,
      tag: storageLabelTag(storageScore.score),
      rows: [],
    },
    {
      title: "Software",
      score: softwareScore.score,
      tag: softwareTag,
      rows: [],
    },
    {
      title: "Rear Camera",
      score: rearCameraScore,
      tag: rearCameraTag,
      rows: [
        ["Rear Camera", specs.rearCamera || specs.camera],
      ],
    },
    {
      title: "Front Camera",
      score: frontCameraScore,
      tag: frontCameraTag,
      rows: [["Front Camera", specs.frontCamera]],
    },
    {
      title: "Battery & Charging",
      score: batteryScore.score,
      tag: batteryLabelTag(batteryScore.score),
      rows: [
        ["Battery", specs.battery],
        ["Charging", specs.charging],
      ],
    },
    {
      title: "Security & Sensors",
      score: securitySensorScore.total,
      tag: securitySensorTag,
      rows: [],
    },
    {
      title: "Network",
      score: networkScore.score,
      tag: networkTag,
      rows: [],
    },
  ];

  return (
    <section className="panel p-4">
      <div className="mb-3 border-b border-slate-200 pb-3">
        <h2 className="text-base font-bold text-slate-900">Full Specifications</h2>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <article key={section.title}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-blue-700">{section.title}</h3>
                {section.noScore ? null : section.tag ? (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${section.tag.className}`}>
                    {section.tag.label}
                  </span>
                ) : null}
              </div>
              {section.noScore ? null : <ScoreCircle score={section.score} />}
            </div>

            {section.title === "Display" ? (
              <DisplaySpecsTable display={effectiveDisplay} displays={displays} />
            ) : section.title === "General" ? (
              <GeneralSection general={general} specs={specs} />
            ) : section.title === "Design & Build" ? (
              <DesignSection design={design} />
            ) : section.title === "Performance" ? (
              <PerformanceSection performance={effectivePerformance} />
            ) : section.title === "Storage" ? (
              <StorageSpecsTable memoryStorage={effectiveStorage.memoryStorage} variants={effectiveStorage.variants} />
            ) : section.title === "Battery & Charging" ? (
              <BatterySpecsTable battery={effectiveBattery} />
            ) : section.title === "Rear Camera" ? (
              <RearCameraSection rearCamera={effectiveRearCamera} />
            ) : section.title === "Front Camera" ? (
              <FrontCameraSection frontCamera={effectiveFrontCamera} />
            ) : section.title === "Security & Sensors" ? (
              <SecurityAndSensorsSection security={security} sensors={sensors} />
            ) : section.title === "Network" ? (
              <NetworkSection network={network} />
            ) : section.title === "Software" ? (
              <SoftwareSection software={software} />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white">
                {section.rows.map(([label, value]) => (
                  <div
                    key={`${section.title}-${label}`}
                    className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[180px_minmax(0,1fr)]"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-slate-900">{value || "NA"}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

