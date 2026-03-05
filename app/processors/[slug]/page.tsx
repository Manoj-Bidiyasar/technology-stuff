import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProcessorDetailBySlug } from "@/lib/processors/details";
import { listProcessorProfiles, type ProcessorProfile } from "@/lib/processors/profiles";

type Props = {
  params: Promise<{ slug: string }>;
};

function antutuLabel(value?: number): string {
  if (!value || value <= 0) return "NA";
  return Math.round(value).toLocaleString("en-IN");
}

function decimal(value?: number, digits = 1): string {
  if (!Number.isFinite(value)) return "NA";
  return Number.isInteger(value) ? String(value) : (value as number).toFixed(digits);
}

function tier(score: number): string {
  if (score >= 2300000) return "Ultra Flagship";
  if (score >= 1800000) return "Flagship";
  if (score >= 1300000) return "Upper Midrange";
  if (score >= 900000) return "Midrange";
  return "Entry";
}

function perfIndex(score: number): number {
  return Math.max(0, Math.min(100, Math.round((score / 3000000) * 100)));
}

function efficiency(nm?: number): number {
  if (!Number.isFinite(nm)) return 60;
  if ((nm as number) <= 3) return 94;
  if ((nm as number) <= 4) return 88;
  if ((nm as number) <= 5) return 80;
  if ((nm as number) <= 6) return 72;
  return 64;
}

function gaming(profile: ProcessorProfile): number {
  const base = perfIndex(profile.antutu || 0);
  const gpuBonus = profile.gpu ? 6 : 0;
  return Math.min(100, Math.round(base * 0.85 + gpuBonus));
}

function value(profile: ProcessorProfile): number {
  const usage = Math.min(100, (profile.phoneCount || 0) * 12);
  const avg = Math.min(100, Math.round((profile.avgPhoneScore || 0) * 10));
  return Math.round(avg * 0.7 + usage * 0.3);
}

function neighbors(target: ProcessorProfile, all: ProcessorProfile[]) {
  return all
    .filter((p) => p.slug !== target.slug)
    .map((p) => ({ ...p, gap: Math.abs((p.antutu || 0) - (target.antutu || 0)) }))
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 8);
}

function tone(score: number): string {
  if (score >= 90) return "text-emerald-700";
  if (score >= 80) return "text-blue-700";
  if (score >= 70) return "text-amber-700";
  return "text-slate-700";
}

function bar(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 80) return "bg-blue-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-slate-400";
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold text-slate-700">{label}</p>
        <p className={`font-extrabold ${tone(value)}`}>{value}/100</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${bar(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 text-blue-700">
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <h2 className="text-base font-extrabold uppercase tracking-wide text-blue-700">{title}</h2>
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const all = await listProcessorProfiles();
  const p = all.find((item) => item.slug === slug);
  if (!p) return { title: "Processor not found" };
  return {
    title: `${p.name} - Processor Details`,
    description: `${p.name} benchmark profile, architecture hints, efficiency score, and similar chip alternatives.`,
  };
}

export default async function ProcessorDetailPage({ params }: Props) {
  const { slug } = await params;
  const all = await listProcessorProfiles();
  const p = all.find((item) => item.slug === slug);
  if (!p) notFound();

  const detail = getProcessorDetailBySlug(slug);
  const similar = neighbors(p, all);
  const perf = perfIndex(p.antutu || 0);
  const eff = efficiency(p.fabricationNm);
  const game = gaming(p);
  const val = value(p);

  const benchAntutu = detail?.benchmarks?.antutu || p.antutu || 0;
  const benchSingle = detail?.benchmarks?.geekbenchSingle || 0;
  const benchMulti = detail?.benchmarks?.geekbenchMulti || 0;
  const bench3d = detail?.benchmarks?.threeDMark || 0;

  const antutuPct = Math.max(1, Math.min(100, Math.round((benchAntutu / 3500000) * 100)));
  const singlePct = Math.max(1, Math.min(100, Math.round((benchSingle / 3500) * 100)));
  const multiPct = Math.max(1, Math.min(100, Math.round((benchMulti / 14000) * 100)));
  const markPct = Math.max(1, Math.min(100, Math.round((bench3d / 10000) * 100)));

  return (
    <main className="mobile-container py-6 sm:py-8">
      <section className="mb-3 text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-2">
          <Link href="/" className="hover:text-blue-700">Home</Link>
          <span>/</span>
          <Link href="/processors" className="hover:text-blue-700">Processors</Link>
          <span>/</span>
          <span className="text-slate-700">{p.name}</span>
        </div>
      </section>

      <section className="panel p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">{p.vendor}</span>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{tier(p.antutu || 0)}</span>
              {detail?.announced ? (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  Announced: {detail.announced}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">{p.name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Detailed chipset profile with benchmark emphasis, efficiency indicators, and practical comparison data for smartphone buyers.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/processors" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800">Compare Processors</Link>
              {similar[0] ? (
                <Link href={`/processors/${similar[0].slug}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:border-blue-300 hover:text-blue-700">
                  See vs {similar[0].name}
                </Link>
              ) : null}
            </div>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Chip Score</p>
            <div className="mt-2 inline-flex h-20 w-20 items-center justify-center rounded-full border-4 border-blue-500 bg-blue-50">
              <div className="text-center">
                <p className="text-xl font-black text-blue-700">{perf}</p>
                <p className="text-[10px] font-bold uppercase text-blue-700">/100</p>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <p>AnTuTu: <span className="font-bold text-slate-800">{antutuLabel(p.antutu)}</span></p>
              <p>Fabrication: <span className="font-bold text-slate-800">{p.fabricationNm ? `${p.fabricationNm}nm` : "NA"}</span></p>
              <p>GPU: <span className="font-bold text-slate-800">{p.gpu || "NA"}</span></p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-4 panel p-3">
        <div className="overflow-x-auto pb-1">
          <div className="flex w-max flex-nowrap gap-2 text-sm font-semibold">
            <a href="#benchmarks" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Benchmarks</a>
            <a href="#cpu-memory" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">CPU & Memory</a>
            <a href="#graphics" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Graphics & Gaming</a>
            <a href="#connectivity" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Connectivity</a>
            <a href="#camera-media" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Camera & Media</a>
            <a href="#devices" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Devices</a>
            <a href="#similar" className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Similar Chips</a>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <article id="benchmarks">
            <SectionHeader title="Benchmarks" />
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="grid grid-cols-[240px_36px_minmax(0,1fr)] text-sm">
                <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">AnTuTu v10</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>{antutuLabel(benchAntutu)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${antutuPct}%` }} /></div>
                </div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">Geekbench 6 Single-Core</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="border-b border-slate-200 bg-white px-4 py-3">
                  <div className="font-semibold text-slate-900">{benchSingle ? benchSingle.toLocaleString("en-IN") : "NA"}</div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${singlePct}%` }} /></div>
                </div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">Geekbench 6 Multi-Core</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="border-b border-slate-200 bg-white px-4 py-3">
                  <div className="font-semibold text-slate-900">{benchMulti ? benchMulti.toLocaleString("en-IN") : "NA"}</div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-amber-500" style={{ width: `${multiPct}%` }} /></div>
                </div>
                <div className="border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">3DMark Wild Life</div>
                <div className="border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="bg-white px-4 py-3">
                  <div className="font-semibold text-slate-900">{bench3d ? bench3d.toLocaleString("en-IN") : "NA"}</div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${markPct}%` }} /></div>
                </div>
              </div>
            </div>
          </article>

          <article id="cpu-memory">
            <SectionHeader title="CPU Architecture" />
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="grid grid-cols-[240px_36px_minmax(0,1fr)] text-sm">
                <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">CPU Layout</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="border-b border-slate-200 bg-white px-4 py-3 text-slate-900">{detail?.cores || "NA"}</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">Architecture</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="border-b border-slate-200 bg-white px-4 py-3 text-slate-900">{detail?.architecture || "NA"}</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">Peak CPU Frequency</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="border-b border-slate-200 bg-white px-4 py-3 text-slate-900">{p.maxCpuGhz ? `${decimal(p.maxCpuGhz, 2)} GHz` : "NA"}</div>
                <div className="border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">Class</div>
                <div className="border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="bg-white px-4 py-3 text-slate-900">{detail?.className || "NA"}</div>
              </div>
            </div>
          </article>

          <article>
            <SectionHeader title="Memory & Storage Support" />
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="grid grid-cols-[240px_36px_minmax(0,1fr)] text-sm">
                <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">Memory Type</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="border-b border-slate-200 bg-white px-4 py-3 text-slate-900">{detail?.memoryType || "NA"}</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">Memory Frequency</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="border-b border-slate-200 bg-white px-4 py-3 text-slate-900">{detail?.memoryFreqMhz ? `${detail.memoryFreqMhz.toLocaleString("en-IN")} MHz` : "NA"}</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">Max Memory</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="border-b border-slate-200 bg-white px-4 py-3 text-slate-900">{detail?.maxMemoryGb ? `${detail.maxMemoryGb}GB` : "NA"}</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">Storage Type</div>
                <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="border-b border-slate-200 bg-white px-4 py-3 text-slate-900">{detail?.storageType || "NA"}</div>
                <div className="border-r border-slate-200 bg-slate-50 px-4 py-3 font-bold uppercase text-slate-600">Bandwidth</div>
                <div className="border-r border-slate-200 bg-slate-50 px-3 py-3 text-center font-bold text-slate-500">-</div>
                <div className="bg-white px-4 py-3 text-slate-900">{detail?.bandwidthGbps ? `${decimal(detail.bandwidthGbps, 1)} GB/s` : "NA"}</div>
              </div>
            </div>
          </article>

          <article id="graphics" className="panel overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-base font-extrabold text-slate-900">Graphics & Gaming</div>
            <div className="grid grid-cols-2 text-sm">
              <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">GPU</div>
              <div className="border-b border-slate-200 bg-white px-3 py-2 text-slate-900">{p.gpu || "NA"}</div>
              <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Gaming Index</div>
              <div className="border-b border-slate-200 bg-white px-3 py-2 text-slate-900">{game}/100</div>
              <div className="border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Thermal/Efficiency Index</div>
              <div className="bg-white px-3 py-2 text-slate-900">{eff}/100</div>
            </div>
          </article>

          <article id="connectivity">
            <SectionHeader title="Connectivity" />
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
              <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Modem</div>
              <div className="border-b border-slate-200 bg-white px-3 py-2 text-slate-900">{detail?.modem || "NA"}</div>
              <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Download Speed</div>
              <div className="border-b border-slate-200 bg-white px-3 py-2 text-slate-900">{detail?.downloadMbps ? `${detail.downloadMbps.toLocaleString("en-IN")} Mbps` : "NA"}</div>
              <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Upload Speed</div>
              <div className="border-b border-slate-200 bg-white px-3 py-2 text-slate-900">{detail?.uploadMbps ? `${detail.uploadMbps.toLocaleString("en-IN")} Mbps` : "NA"}</div>
              <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Wi-Fi</div>
              <div className="border-b border-slate-200 bg-white px-3 py-2 text-slate-900">{detail?.wifi || "NA"}</div>
              <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Bluetooth</div>
              <div className="border-b border-slate-200 bg-white px-3 py-2 text-slate-900">{detail?.bluetooth || "NA"}</div>
              <div className="border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Navigation</div>
              <div className="bg-white px-3 py-2 text-slate-900">{detail?.navigation?.length ? detail.navigation.join(", ") : "NA"}</div>
            </div>
          </article>

          <article id="camera-media">
            <SectionHeader title="Camera & Media Engine" />
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
              <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Camera Support</div>
              <div className="border-b border-slate-200 bg-white px-3 py-2 text-slate-900">{detail?.cameraSupport || "NA"}</div>
              <div className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Video Capture</div>
              <div className="border-b border-slate-200 bg-white px-3 py-2 text-slate-900">{detail?.videoCapture || "NA"}</div>
              <div className="border-r border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">Video Playback</div>
              <div className="bg-white px-3 py-2 text-slate-900">{detail?.videoPlayback || "NA"}</div>
            </div>
            {detail?.sourceUrl ? (
              <div className="border-t border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                Source reference:{" "}
                <a href={detail.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">
                  External specification page
                </a>
              </div>
            ) : null}
          </article>
        </div>

        <aside className="space-y-5">
          <article className="panel p-4">
            <h2 className="text-base font-extrabold text-slate-900">Real-World Score</h2>
            <div className="mt-3 space-y-2">
              <ProgressRow label="Performance" value={perf} />
              <ProgressRow label="Efficiency" value={eff} />
              <ProgressRow label="Gaming" value={game} />
              <ProgressRow label="Value for Money" value={val} />
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              Avg Device Rating: <span className="font-bold text-slate-800">{decimal(p.avgPhoneScore)} / 10</span>
              <br />
              Devices Using This Chip: <span className="font-bold text-slate-800">{p.phoneCount}</span>
            </div>
          </article>

          <article id="devices" className="panel p-4">
            <h2 className="text-base font-extrabold text-slate-900">Phones with {p.name}</h2>
            {p.topPhones.length > 0 ? (
              <div className="mt-3 space-y-2">
                {p.topPhones.map((phone) => (
                  <Link key={`${p.slug}-${phone.slug}`} href={`/mobile/${phone.slug}`} className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700">
                    {phone.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">No mapped phones yet.</p>
            )}
          </article>

          <article id="similar" className="panel p-4">
            <h2 className="text-base font-extrabold text-slate-900">Similar Processors</h2>
            <div className="mt-3 space-y-2">
              {similar.map((item) => (
                <Link key={item.slug} href={`/processors/${item.slug}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700">
                  <span className="truncate pr-2">{item.name}</span>
                  <span className="text-xs font-bold text-slate-500">{antutuLabel(item.antutu)}</span>
                </Link>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}
