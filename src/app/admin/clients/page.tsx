"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  slug: string;
  isPasswordProtected: boolean;
  _count: { campaignReports: number; uploadHistories: number };
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);

  async function load() {
    const response = await fetch("/api/clients");
    const data = await response.json();
    setClients(data.clients ?? []);
  }

  async function remove(id: string) {
    if (!confirm("클라이언트를 삭제할까요? 업로드된 데이터도 함께 삭제됩니다.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">클라이언트</h1>
          <p className="mt-1 text-sm text-slate-500">광고주별 공유 URL과 업로드 데이터를 관리합니다.</p>
        </div>

        <Link href="/admin/clients/new" className="btn-primary">
          신규 클라이언트
        </Link>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">클라이언트명</th>
                <th className="px-4 py-3">공유 URL</th>
                <th className="px-4 py-3">비밀번호</th>
                <th className="px-4 py-3">데이터 수</th>
                <th className="px-4 py-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-bold">{client.name}</td>
                  <td className="px-4 py-3">
                    <Link className="text-brand-700 underline" href={`/dashboard/${client.slug}`}>
                      /dashboard/{client.slug}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{client.isPasswordProtected ? "사용" : "미사용"}</td>
                  <td className="px-4 py-3">{client._count.campaignReports.toLocaleString("ko-KR")}건</td>
                  <td className="space-x-3 px-4 py-3">
                    <Link className="text-sm font-semibold text-brand-700" href={`/admin/clients/${client.id}`}>
                      수정
                    </Link>
                    <button className="text-sm font-semibold text-red-600" onClick={() => remove(client.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
