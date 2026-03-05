import type { ReactNode } from "react";

type TagProps = {
  children: ReactNode;
};

export default function Tag({ children }: TagProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}
