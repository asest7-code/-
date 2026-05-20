"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DashboardAnalyticsPayload } from "@/types/dashboard";

const colors = ["#1D4ED8", "#0891B2", "#059669", "#F59E0B", "#EF4444", "#7C3AED"];

export function DashboardCharts({
  analytics,
  loading
}: {
  analytics: DashboardAnalyticsPayload | null;
  loading: boolean;
}) {
  if (!analytics) {
    return (
      <section className="panel p-5">
        <h2 className="font-bold text-slate-950">차트</h2>
        <p className="mt-3 text-sm text-slate-500">{loading ? "차트 데이터를 불러오는 중입니다." : "차트 데이터를 불러오지 못했습니다."}</p>
      </section>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartBox title="일자별 광고비 / 매출 추이">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={analytics.timeSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="cost" name="광고비" stroke="#1D4ED8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="revenue" name="매출" stroke="#059669" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartBox title="일자별 클릭수 / 전환수">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={analytics.timeSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="clicks" name="클릭수" stroke="#1D4ED8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="conversions" name="전환수" stroke="#0891B2" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartBox title="일자별 ROAS 추이">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={analytics.timeSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="roas" name="ROAS" stroke="#F59E0B" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartBox title="매체별 광고비 비중">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={analytics.platformBreakdown} dataKey="cost" nameKey="platform" outerRadius={95} label>
              {analytics.platformBreakdown.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartBox title="매체별 ROAS 비교">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={analytics.platformBreakdown}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="roas" name="ROAS" fill="#0891B2" />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>

      <ChartBox title="캠페인별 ROAS 순위">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={analytics.campaignRankings.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="campaignName" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="roas" name="ROAS" fill="#1D4ED8" />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-4">
      <h2 className="font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
