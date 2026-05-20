import { DemoClient } from "@/app/demo/demo-client";
import { getDemoDashboardPayload } from "@/services/report/demo-data";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const payload = await getDemoDashboardPayload();
  return <DemoClient payload={payload} />;
}
