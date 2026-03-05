"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProcessorProfile } from "@/lib/processors/profiles";

type Props = {
  processors: ProcessorProfile[];
};

function num(value?: number, digits = 1): string {
  if (!Number.isFinite(value)) return "NA";
  const v = value as number;
  return Number.isInteger(v) ? String(v) : v.toFixed(digits);
}

function antutuLabel(value?: number): string {
  if (!value || value <= 0) return "NA";
  return `~${Math.round(value).toLocaleString("en-IN")}`;
}

function rowBest(left: number, right: number, lowerIsBetter = false): "left" | "right" | "tie" {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return "tie";
  if (left === right) return "tie";
  if (lowerIsBetter) return left < right ? "left" : "right";
  return left > right ? "left" : "right";
}

function scoreTone(score: number): string {
  if (score >= 9) return "text-emerald-700";
  if (score >= 8) return "text-blue-700";
  if (score >= 7) return "text-amber-700";
  return "text-slate-700";
}

export default function ProcessorCompareClient({ processors }: Props) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [compared, setCompared] = useState(false);

  const selectedProfiles = useMemo(() => {
    const map = new Map(processors.map((p) => [p.name.toLowerCase(), p]));
    return selected.map((name) => map.get(name.toLowerCase())).filter((p): p is ProcessorProfile => Boolean(p));
  }, [processors, selected]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t
      ? processors.filter((p) => p.name.toLowerCase().includes(t) || p.vendor.toLowerCase().includes(t))
      : processors;
    return list.slice(0, 30);
  }, [processors, q]);

  const topRanked = useMemo(() => {
    return [...processors]
      .sort((a, b) => (b.antutu || 0) - (a.antutu || 0))
      .slice(0, 12);
  }, [processors]);

  function addProcessor(name: string) {
    setSelected((prev) => {
      if (prev.includes(name) || prev.length >= 2) return prev;
      setCompared(false);
      return [...prev, name];
    });
  }

  function removeProcessor(name: string) {
    setCompared(false);
    setSelected((prev) => prev.filter((item) => item !== name));
  }

  const left = selectedProfiles[0];
  const right = selectedProfiles[1];

  const antutuWin = rowBest(Number(left?.antutu || 0), Number(right?.antutu || 0));
  const fabWin = rowBest(Number(left?.fabricationNm || NaN), Number(right?.fabricationNm || NaN), true);
  const cpuWin = rowBest(Number(left?.maxCpuGhz || 0), Number(right?.maxCpuGhz || 0));
  const scoreWin = rowBest(Number(left?.avgPhoneScore || 0), Number(right?.avgPhoneScore || 0));

  return (
    <main className="mobile-container py-6 sm:py-8">
      <section className="panel p-4 sm:p-5">
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Processor Comparison</h1>
        <p className="mt-2 text-sm text-slate-600">
          Compare smartphone chipsets by benchmark, fabrication, peak CPU clock, and real device presence.
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quick Compare</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex min-h-10 min-w-[220px] flex-1 items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
              <span className={`truncate text-sm ${left ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                {left?.name || "Select Processor A"}
              </span>
              {left ? (
                <button type="button" onClick={() => removeProcessor(left.name)} className="ml-2 text-xs font-bold text-slate-500 hover:text-slate-800">
                  x
                </button>
              ) : null}
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-extrabold text-white">
              VS
            </span>
            <div className="flex min-h-10 min-w-[220px] flex-1 items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
              <span className={`truncate text-sm ${right ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                {right?.name || "Select Processor B"}
              </span>
              {right ? (
                <button type="button" onClick={() => removeProcessor(right.name)} className="ml-2 text-xs font-bold text-slate-500 hover:text-slate-800">
                  x
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setCompared(true)}
              disabled={!left || !right}
              className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Compare
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Pick two processors from the list below, then click compare.</p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label htmlFor="proc-q" className="text-xs font-bold uppercase tracking-wide text-slate-500">Search Processor</label>
          <input
            id="proc-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Snapdragon 8 Gen 3"
            className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-blue-200 focus:ring-2"
          />
          <div className="mt-2 max-h-72 space-y-2 overflow-auto pr-1">
            {filtered.map((p) => {
              const isAdded = selected.includes(p.name);
              return (
                <div key={p.slug} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/processors/${p.slug}`} className="truncate text-sm font-semibold text-slate-900 hover:text-blue-700">
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500">{p.vendor} | {antutuLabel(p.antutu)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProcessor(p.name)}
                    disabled={isAdded || selected.length >= 2}
                    className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAdded ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-5 panel overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-base font-extrabold text-slate-900">
          Side-by-Side Processor Table
        </div>
        {!compared ? (
          <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
            Select two processors and click <span className="text-slate-700">Compare</span> to view full comparison.
          </div>
        ) : (
        <div className="grid grid-cols-3 text-sm">
          <div className="border-b border-r border-slate-200 bg-slate-100 px-3 py-2 font-bold text-slate-800">Metric</div>
          <div className="border-b border-r border-slate-200 bg-white px-3 py-2 font-bold text-slate-900">{left?.name || "Select Processor A"}</div>
          <div className="border-b border-slate-200 bg-white px-3 py-2 font-bold text-slate-900">{right?.name || "Select Processor B"}</div>

          <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">AnTuTu</div>
          <div className={`border-b border-r border-slate-200 px-3 py-2 ${antutuWin === "left" ? "bg-emerald-50 font-bold text-emerald-700" : "bg-white text-slate-800"}`}>{antutuLabel(left?.antutu)}</div>
          <div className={`border-b border-slate-200 px-3 py-2 ${antutuWin === "right" ? "bg-emerald-50 font-bold text-emerald-700" : "bg-white text-slate-800"}`}>{antutuLabel(right?.antutu)}</div>

          <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Fabrication</div>
          <div className={`border-b border-r border-slate-200 px-3 py-2 ${fabWin === "left" ? "bg-emerald-50 font-bold text-emerald-700" : "bg-white text-slate-800"}`}>{left?.fabricationNm ? `${num(left.fabricationNm)}nm` : "NA"}</div>
          <div className={`border-b border-slate-200 px-3 py-2 ${fabWin === "right" ? "bg-emerald-50 font-bold text-emerald-700" : "bg-white text-slate-800"}`}>{right?.fabricationNm ? `${num(right.fabricationNm)}nm` : "NA"}</div>

          <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Max CPU Clock</div>
          <div className={`border-b border-r border-slate-200 px-3 py-2 ${cpuWin === "left" ? "bg-emerald-50 font-bold text-emerald-700" : "bg-white text-slate-800"}`}>{left?.maxCpuGhz ? `${num(left.maxCpuGhz, 2)} GHz` : "NA"}</div>
          <div className={`border-b border-slate-200 px-3 py-2 ${cpuWin === "right" ? "bg-emerald-50 font-bold text-emerald-700" : "bg-white text-slate-800"}`}>{right?.maxCpuGhz ? `${num(right.maxCpuGhz, 2)} GHz` : "NA"}</div>

          <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">GPU</div>
          <div className="border-b border-r border-slate-200 bg-white px-3 py-2 text-slate-800">{left?.gpu || "NA"}</div>
          <div className="border-b border-slate-200 bg-white px-3 py-2 text-slate-800">{right?.gpu || "NA"}</div>

          <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Avg Device Score</div>
          <div className={`border-b border-r border-slate-200 px-3 py-2 ${scoreWin === "left" ? "bg-emerald-50 font-bold text-emerald-700" : "bg-white"} ${scoreTone(Number(left?.avgPhoneScore || 0))}`}>{left ? `${num(left.avgPhoneScore)} / 10` : "NA"}</div>
          <div className={`border-b border-slate-200 px-3 py-2 ${scoreWin === "right" ? "bg-emerald-50 font-bold text-emerald-700" : "bg-white"} ${scoreTone(Number(right?.avgPhoneScore || 0))}`}>{right ? `${num(right.avgPhoneScore)} / 10` : "NA"}</div>

          <div className="border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Phones Using Chip</div>
          <div className="border-r border-slate-200 bg-white px-3 py-2 text-slate-800">{left?.phoneCount ?? "NA"}</div>
          <div className="bg-white px-3 py-2 text-slate-800">{right?.phoneCount ?? "NA"}</div>
        </div>
        )}
      </section>

      <section className="mt-5 panel p-4">
        <h2 className="text-lg font-extrabold text-slate-900">Top Processor Rankings</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {topRanked.map((p, i) => (
            <article key={p.slug} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/processors/${p.slug}`} className="text-sm font-bold text-slate-900 hover:text-blue-700">
                  #{i + 1} {p.name}
                </Link>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{p.vendor}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-slate-50 px-2 py-1">
                  <p className="text-slate-500">AnTuTu</p>
                  <p className="font-bold text-slate-800">{antutuLabel(p.antutu)}</p>
                </div>
                <div className="rounded-md bg-slate-50 px-2 py-1">
                  <p className="text-slate-500">Fabrication</p>
                  <p className="font-bold text-slate-800">{p.fabricationNm ? `${num(p.fabricationNm)}nm` : "NA"}</p>
                </div>
              </div>
              {p.topPhones.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-slate-500">Popular Devices</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {p.topPhones.slice(0, 3).map((phone) => (
                      <Link key={`${p.name}-${phone.slug}`} href={`/mobile/${phone.slug}`} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                        {phone.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
