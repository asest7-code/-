import Link from "next/link";
import { countClients, listAllReports, listRecentUploads } from "@/lib/data-service";
import { calculateMetrics } from "@/utils/metrics";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [clients, reports, uploads] = await Promise.all([
    countClients(),
    listAllReports(),
    listRecentUploads(6)
  ]);
  const summary = calculateMetrics(reports.map((row) => ({ ...row, date: typeof row.date === "string" ? row.date : row.date.toISOString() })));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">관리자 홈</h1>
          <p className="mt-1 text-sm text-slate-500">클라이언트와 업로드된 광고 데이터를 한눈에 확인합니다.</p>
        </div>
        <Link href="/admin/upload" className="btn-primary">
          데이터 업로드
        </Link>
        <Link href="/admin/reports" className="btn-secondary">
          데이터 수정
        </Link>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetric title="전체 클라이언트" value={`${clients.toLocaleString("ko-KR")}개`} />
        <AdminMetric title="전체 광고비" value={`${summary.cost.toLocaleString("ko-KR")}원`} />
        <AdminMetric title="전체 전환수" value={`${summary.conversions.toLocaleString("ko-KR")}건`} />
        <AdminMetric title="전체 매출" value={`${summary.revenue.toLocaleString("ko-KR")}원`} />
      </section>
      <section className="panel p-5">
        <h2 className="text-lg font-bold">최근 업로드 내역</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-3">클라이언트</th>
                <th className="px-3 py-3">파일명</th>
                <th className="px-3 py-3">행 수</th>
                <th className="px-3 py-3">상태</th>
                <th className="px-3 py-3">일시</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload) => (
                <tr key={upload.id} className="border-b last:border-0">
                  <td className="px-3 py-3 font-semibold">{upload.client.name}</td>
                  <td className="px-3 py-3">{upload.fileName}</td>
                  <td className="px-3 py-3">{upload.rowCount.toLocaleString("ko-KR")}</td>
                  <td className="px-3 py-3">{upload.status}</td>
                  <td className="px-3 py-3">{upload.createdAt.toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AdminMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="panel p-5">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
