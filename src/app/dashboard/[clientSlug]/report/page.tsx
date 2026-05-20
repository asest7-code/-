import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function ClientReportPage({ params }: { params: { clientSlug: string } }) {
  return <DashboardView clientSlug={params.clientSlug} reportMode />;
}
