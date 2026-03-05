export type ScoreBadgeTone = {
  outerClass: string;
  subTextClass: string;
};

export function getScoreBadgeTone(score: number): ScoreBadgeTone {
  const safe = Number.isFinite(score) ? score : 0;

  if (safe >= 85) {
    return {
      outerClass: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500",
      subTextClass: "text-emerald-700",
    };
  }
  if (safe >= 75) {
    return {
      outerClass: "bg-gradient-to-br from-blue-600 via-cyan-500 to-indigo-600",
      subTextClass: "text-blue-700",
    };
  }
  if (safe >= 65) {
    return {
      outerClass: "bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500",
      subTextClass: "text-amber-700",
    };
  }
  if (safe >= 50) {
    return {
      outerClass: "bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700",
      subTextClass: "text-slate-700",
    };
  }
  return {
    outerClass: "bg-gradient-to-br from-rose-500 via-red-500 to-rose-600",
    subTextClass: "text-rose-700",
  };
}
