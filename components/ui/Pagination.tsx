import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
};

function hrefWithPage(basePath: string, page: number, params: Record<string, string | undefined>) {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value || key === "page") return;
    qp.set(key, value);
  });
  qp.set("page", String(page));
  return `${basePath}?${qp.toString()}`;
}

export default function Pagination({ page, totalPages, basePath, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <Link
        href={hrefWithPage(basePath, Math.max(1, page - 1), searchParams)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
      >
        Prev
      </Link>
      <span className="text-sm font-semibold text-slate-600">
        Page {page} / {totalPages}
      </span>
      <Link
        href={hrefWithPage(basePath, Math.min(totalPages, page + 1), searchParams)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
      >
        Next
      </Link>
    </div>
  );
}
