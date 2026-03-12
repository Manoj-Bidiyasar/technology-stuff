"use client";

import { redirect } from "next/navigation";

export default function AdminHelperIndexPage() {
  redirect("/admin/helper/processor-terms");
}
