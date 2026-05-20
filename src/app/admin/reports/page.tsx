"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  slug: string;
};

type ReportRow = {
  id: string;
  clientId: string;
  client: Client;
  date: string;
  platform: string;
  campaignName: string;
  adGroupName: string;
  adName: string;
  device?: string | null;
  keyword?: string | null;
  creativeName?: string | null;
  landingPage?: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
  purchases?: number | null;
  leads?: number | null;
  memo?: string | null;
};

const emptyForm = {
  date: "",
  platform: "",
  campaignName: "",
  adGroupName: "",
  adName: "",
  device: "",
  keyword: "",
  creativeName: "",
  landingPage: "",
  impressions: 0,
  clicks: 0,
  cost: 0,
  conversions: 0,
  revenue: 0,
  purchases: 0,
  leads: 0,
  memo: ""
};

export default function AdminReportsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  async function loadClients() {
    const response = await fetch("/api/clients");
    const data = await response.json();
    setClients(data.clients ?? []);
  }

  async function loadReports(nextPage = page) {
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: "20"
    });
    if (clientId !== "ALL") params.set("clientId", clientId);
    if (query.trim()) params.set("query", query.trim());
    const response = await fetch(`/api/reports?${params.toString()}`);
    const data = await response.json();
    setRows(data.rows ?? []);
    setTotal(data.total ?? 0);
  }

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    loadReports(1);
    setPage(1);
  }, [clientId, query]);

  useEffect(() => {
    loadReports(page);
  }, [page]);

  function selectRow(row: ReportRow) {
    setSelected(row);
    setForm({
      date: row.date.slice(0, 10),
      platform: row.platform,
      campaignName: row.campaignName,
      adGroupName: row.adGroupName,
      adName: row.adName,
      device: row.device ?? "",
      keyword: row.keyword ?? "",
      creativeName: row.creativeName ?? "",
      landingPage: row.landingPage ?? "",
      impressions: row.impressions,
      clicks: row.clicks,
      cost: row.cost,
      conversions: row.conversions,
      revenue: row.revenue,
      purchases: row.purchases ?? 0,
      leads: row.leads ?? 0,
      memo: row.memo ?? ""
    });
    setMessage("");
  }

  async function save() {
    if (!selected) return;
    setMessage("");
    const response = await fetch(`/api/reports/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage("수정에 실패했습니다.");
      return;
    }
    setMessage("수정이 완료되었습니다.");
    setSelected(data.report ? { ...selected, ...data.report } : selected);
    loadReports();
  }

  async function remove() {
    if (!selected) return;
    if (!confirm("선택한 행을 삭제할까요?")) return;
    const response = await fetch(`/api/reports/${selected.id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("삭제에 실패했습니다.");
      return;
    }
    setMessage("삭제가 완료되었습니다.");
    setSelected(null);
    setForm(emptyForm);
    loadReports();
  }

  const pageCount = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">데이터 수정</h1>
        <p className="mt-1 text-sm text-slate-500">업로드된 광고 성과 행을 검색하고 수정하거나 삭제할 수 있습니다.</p>
      </div>

      <section className="panel grid gap-3 p-4 lg:grid-cols-[220px_1fr]">
        <select className="input" value={clientId} onChange={(event) => setClientId(event.target.value)}>
          <option value="ALL">전체 클라이언트</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <input className="input" placeholder="매체, 캠페인, 광고그룹, 소재명 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-3">일자</th>
                  <th className="px-3 py-3">클라이언트</th>
                  <th className="px-3 py-3">매체</th>
                  <th className="px-3 py-3">캠페인</th>
                  <th className="px-3 py-3">소재</th>
                  <th className="px-3 py-3">광고비</th>
                  <th className="px-3 py-3">매출</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={`cursor-pointer border-b last:border-0 ${selected?.id === row.id ? "bg-blue-50" : "hover:bg-slate-50"}`} onClick={() => selectRow(row)}>
                    <td className="px-3 py-3">{row.date.slice(0, 10)}</td>
                    <td className="px-3 py-3 font-semibold">{row.client.name}</td>
                    <td className="px-3 py-3">{row.platform}</td>
                    <td className="px-3 py-3">{row.campaignName}</td>
                    <td className="px-3 py-3">{row.adName}</td>
                    <td className="px-3 py-3">{row.cost.toLocaleString("ko-KR")}</td>
                    <td className="px-3 py-3">{row.revenue.toLocaleString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t p-4 text-sm">
            <span>
              {total.toLocaleString("ko-KR")}행 중 {page}/{pageCount}
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                이전
              </button>
              <button className="btn-secondary" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                다음
              </button>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-lg font-bold">선택 행 수정</h2>
          <p className="mt-1 text-sm text-slate-500">{selected ? `${selected.client.name} / ${selected.platform}` : "왼쪽 표에서 수정할 데이터를 선택해 주세요."}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="일자" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
            <Field label="매체" value={form.platform} onChange={(value) => setForm({ ...form, platform: value })} />
            <Field label="캠페인" value={form.campaignName} onChange={(value) => setForm({ ...form, campaignName: value })} />
            <Field label="광고그룹" value={form.adGroupName} onChange={(value) => setForm({ ...form, adGroupName: value })} />
            <Field label="소재명" value={form.adName} onChange={(value) => setForm({ ...form, adName: value })} />
            <Field label="디바이스" value={form.device} onChange={(value) => setForm({ ...form, device: value })} />
            <NumberField label="노출수" value={form.impressions} onChange={(value) => setForm({ ...form, impressions: value })} />
            <NumberField label="클릭수" value={form.clicks} onChange={(value) => setForm({ ...form, clicks: value })} />
            <NumberField label="광고비" value={form.cost} onChange={(value) => setForm({ ...form, cost: value })} />
            <NumberField label="전환수" value={form.conversions} onChange={(value) => setForm({ ...form, conversions: value })} />
            <NumberField label="매출" value={form.revenue} onChange={(value) => setForm({ ...form, revenue: value })} />
            <NumberField label="구매수" value={form.purchases} onChange={(value) => setForm({ ...form, purchases: value })} />
            <NumberField label="리드수" value={form.leads} onChange={(value) => setForm({ ...form, leads: value })} />
            <Field label="키워드" value={form.keyword} onChange={(value) => setForm({ ...form, keyword: value })} />
            <Field label="소재명(확장)" value={form.creativeName} onChange={(value) => setForm({ ...form, creativeName: value })} />
            <Field label="랜딩페이지" value={form.landingPage} onChange={(value) => setForm({ ...form, landingPage: value })} />
          </div>
          <label className="mt-3 block">
            <span className="label">메모</span>
            <textarea className="input mt-1 min-h-24" value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} />
          </label>
          {message ? <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{message}</p> : null}
          <div className="mt-5 flex gap-2">
            <button className="btn-primary" disabled={!selected} onClick={save}>
              수정 저장
            </button>
            <button className="btn-secondary" disabled={!selected} onClick={remove}>
              삭제
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input mt-1" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input mt-1" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
