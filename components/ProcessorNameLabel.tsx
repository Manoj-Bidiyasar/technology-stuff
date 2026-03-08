type LabelLines = {
  line1: string;
  line2?: string;
  forceSingleRow?: boolean;
  mobileTwoRowPreferred?: boolean;
};

function clean(input: string): string {
  return String(input || "").replace(/\s+/g, " ").trim();
}

function stripLeadingVendor(raw: string): string {
  return clean(
    raw
      .replace(/^qualcomm\s+/i, "")
      .replace(/^mediatek\s+/i, "")
      .replace(/^samsung\s+/i, "")
      .replace(/^google\s+/i, "")
      .replace(/^apple\s+/i, "")
      .replace(/^unisoc\s+/i, "")
  );
}

export function getProcessorLabelLines(name: string, vendor: string): LabelLines {
  const raw = clean(name);
  const lower = raw.toLowerCase();
  const v = clean(vendor).toLowerCase();
  const base = stripLeadingVendor(raw);

  const isSnapdragon = /qualcomm/.test(v) || /snapdragon/.test(lower);
  if (isSnapdragon) {
    const suffix = clean(base.replace(/^snapdragon\s+/i, ""));
    if (!suffix) return { line1: "Qualcomm", line2: "Snapdragon" };
    // Case 6: "x Elite Gen x" / "x+ Elite Gen x"
    if (/\belite\s+gen\s*\d+\b/i.test(suffix)) {
      return { line1: "Qualcomm Snapdragon", line2: suffix, mobileTwoRowPreferred: true };
    }
    // Case 5: "xxx/xxx+/xxxG/xxx Pro/x Elite/x Gen x/x+ Gen x"
    return { line1: "Qualcomm", line2: `Snapdragon ${suffix}`, mobileTwoRowPreferred: true };
  }

  const isMediaTek = /mediatek/.test(v) || /dimensity|helio/.test(lower);
  if (isMediaTek) {
    const d = base.match(/dimensity\s+(.+)$/i);
    if (d?.[1]) {
      const suffix = clean(d[1]);
      const tokenCount = suffix.split(" ").filter(Boolean).length;
      const hasTierWord = /\b(pro|ultra|ultimate)\b/i.test(suffix);
      // Long: "MediaTek Dimensity \n xxxx ... ultra/pro/ultimate"
      if (tokenCount >= 3 || hasTierWord) return { line1: "MediaTek Dimensity", line2: suffix, mobileTwoRowPreferred: true };
      // Short: "MediaTek \n Dimensity xxxx/xxxxs/xxxx+"
      return { line1: "MediaTek", line2: `Dimensity ${suffix}`, mobileTwoRowPreferred: true };
    }
    const h = base.match(/helio\s+(.+)$/i);
    if (h?.[1]) {
      const suffix = clean(h[1]);
      const tokenCount = suffix.split(" ").filter(Boolean).length;
      const hasTierWord = /\b(pro|ultra|ultimate)\b/i.test(suffix);
      // Long: "MediaTek Helio \n Gxxx ... ultra/pro/ultimate"
      if (tokenCount >= 3 || hasTierWord) return { line1: "MediaTek Helio", line2: suffix, mobileTwoRowPreferred: true };
      // Short: "MediaTek \n Helio Gxxx/Gxxx+"
      return { line1: "MediaTek", line2: `Helio ${suffix}`, mobileTwoRowPreferred: true };
    }
    return { line1: "MediaTek", line2: base || "Chipset", mobileTwoRowPreferred: true };
  }

  const isSamsung = /samsung/.test(v) || /exynos/.test(lower);
  if (isSamsung) {
    const ex = clean(base.replace(/^exynos\s*/i, ""));
    return { line1: "Samsung", line2: ex ? `Exynos ${ex}` : "Exynos", mobileTwoRowPreferred: true };
  }

  const isGoogle = /google/.test(v) || /tensor/.test(lower);
  if (isGoogle) {
    const t = clean(base.replace(/^tensor\s*/i, ""));
    return { line1: "Google", line2: t ? `Tensor ${t}` : "Tensor", mobileTwoRowPreferred: true };
  }

  const isApple = /apple/.test(v) || /^apple\s/.test(lower);
  if (isApple) {
    // Apple: single-row preferred (A-series name)
    return { line1: clean(`Apple ${base || "A-Series"}`), forceSingleRow: true };
  }

  const isUnisoc = /unisoc/.test(v) || /unisoc|tiger/.test(lower);
  if (isUnisoc) {
    // Unisoc: single-row preferred (e.g. Unisoc T612)
    return { line1: clean(`Unisoc ${base || "T-Series"}`), forceSingleRow: true };
  }

  const parts = base.split(" ").filter(Boolean);
  if (parts.length <= 1) return { line1: raw };
  return { line1: parts.slice(0, 2).join(" "), line2: parts.slice(2).join(" ") || undefined };
}

export default function ProcessorNameLabel({
  name,
  vendor,
  className = "",
  lineClassName = "",
  allowSingleLine = true,
  singleLineMaxChars = 26,
}: {
  name: string;
  vendor: string;
  className?: string;
  lineClassName?: string;
  allowSingleLine?: boolean;
  singleLineMaxChars?: number;
}) {
  const lines = getProcessorLabelLines(name, vendor);
  const combined = clean(`${lines.line1} ${lines.line2 || ""}`);
  const canUseSingleLine =
    allowSingleLine &&
    Boolean(lines.line2) &&
    combined.length <= singleLineMaxChars &&
    combined.split(" ").filter(Boolean).length <= 4;

  const twoRows = (
    <>
      <span className={`block overflow-hidden text-ellipsis whitespace-nowrap ${lineClassName}`}>{lines.line1}</span>
      {lines.line2 ? <span className={`block overflow-hidden text-ellipsis whitespace-nowrap ${lineClassName}`}>{lines.line2}</span> : null}
    </>
  );

  const singleRow = (
    <span className={`block overflow-hidden text-ellipsis whitespace-nowrap ${lineClassName}`}>{combined || lines.line1}</span>
  );

  return (
    <span className={`block w-full max-w-full text-center ${className}`}>
      {lines.forceSingleRow ? (
        singleRow
      ) : lines.mobileTwoRowPreferred && canUseSingleLine ? (
        <>
          <span className="block sm:hidden">{twoRows}</span>
          <span className="hidden sm:block">{singleRow}</span>
        </>
      ) : canUseSingleLine ? (
        singleRow
      ) : (
        twoRows
      )}
    </span>
  );
}
