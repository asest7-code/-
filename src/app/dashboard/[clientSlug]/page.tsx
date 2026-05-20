import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function ClientDashboardPage({ params }: { params: { clientSlug: string } }) {
  return <DashboardView clientSlug={params.clientSlug} />;
}
