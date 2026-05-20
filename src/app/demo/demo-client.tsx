"use client";

import { useState } from "react";
import type { DashboardPayload } from "@/types/dashboard";
import { DashboardContent } from "@/components/dashboard/dashboard-view";

export function DemoClient({ payload }: { payload: DashboardPayload }) {
  const [filters, setFilters] = useState({
    startDate: payload.filters.startDate ?? "",
    endDate: payload.filters.endDate ?? "",
    platform: "ALL",
    campaign: "ALL"
  });

  return <DashboardContent clientSlug="demo" payload={payload} filters={filters} setFilters={setFilters} reportMode />;
}
