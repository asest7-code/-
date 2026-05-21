import bcrypt from "bcryptjs";
import { addDays, differenceInCalendarDays, format, parseISO, startOfMonth, subDays, subMonths, subYears } from "date-fns";
import type { DashboardCompareMode, DashboardFilters } from "@/types/dashboard";
import { getClientBySlug } from "@/lib/data-service";

export async function ensureDashboardAccess(clientSlug: string, password?: string | null) {
  const client = await getClientBySlug(clientSlug);
  if (!client) {
    return { status: 404 as const, client: null };
  }

  if (client.isPasswordProtected) {
    const ok = password && client.sharePasswordHash ? await bcrypt.compare(password, client.sharePasswordHash) : false;
    if (!ok) {
      return { status: 401 as const, client: null };
    }
  }

  return { status: 200 as const, client };
}

export function resolveComparisonRange(filters: DashboardFilters) {
  const compareMode = (filters.compareMode ?? "previous") as DashboardCompareMode;
  if (!filters.startDate || !filters.endDate || compareMode === "none") {
    return {};
  }

  const start = parseISO(filters.startDate);
  const end = parseISO(filters.endDate);

  if (compareMode === "month") {
    const previousMonthStart = startOfMonth(subMonths(start, 1));
    const previousMonthEnd = addDays(startOfMonth(start), -1);
    return {
      previousStartDate: format(previousMonthStart, "yyyy-MM-dd"),
      previousEndDate: format(previousMonthEnd, "yyyy-MM-dd")
    };
  }

  if (compareMode === "year") {
    return {
      previousStartDate: format(subYears(start, 1), "yyyy-MM-dd"),
      previousEndDate: format(subYears(end, 1), "yyyy-MM-dd")
    };
  }

  const length = differenceInCalendarDays(end, start) + 1;
  const previousEnd = subDays(start, 1);
  const previousStart = addDays(previousEnd, -length + 1);

  return {
    previousStartDate: format(previousStart, "yyyy-MM-dd"),
    previousEndDate: format(previousEnd, "yyyy-MM-dd")
  };
}
