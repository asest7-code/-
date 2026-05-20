"use client";

import type { DashboardAnalyticsPayload, DashboardShellPayload } from "@/types/dashboard";
import { currency } from "@/utils/metrics";

export function DashboardInsights({
  summary,
  analytics,
  loading
}: {
  summary: DashboardShellPayload["summary"];
  analytics: DashboardAnalyticsPayload | null;
  loading: boolean;
}) {
  if (!analytics) {
    return (
      <section className="panel p-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-slate-950">데이터 인사이트</h2>
          <p className="text-sm text-slate-500">{loading ? "인사이트를 계산하는 중입니다." : "인사이트를 불러오지 못했습니다."}</p>
        </div>
      </section>
    );
  }

  const insights = buildInsights(summary, analytics);

  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-bold text-slate-950">데이터 인사이트</h2>
        <p className="text-sm text-slate-500">현재 선택한 기간과 필터 조건을 기준으로 실무 보고서 톤에 맞춰 자동 정리한 코멘트입니다.</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {insights.map((insight) => (
          <article key={insight.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-brand-700">{insight.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{insight.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildInsights(summary: DashboardShellPayload["summary"], analytics: DashboardAnalyticsPayload) {
  const bestPlatform = [...analytics.platformBreakdown].sort((a, b) => b.roas - a.roas)[0];
  const weakPlatform = [...analytics.platformBreakdown].sort((a, b) => a.roas - b.roas)[0];
  const topCampaign = analytics.campaignRankings[0];
  const lowCampaign = [...analytics.campaignRankings].sort((a, b) => a.roas - b.roas)[0];
  const highSpendLowReturn = [...analytics.campaignRankings].filter((row) => row.cost > 0 && row.roas <= 100).sort((a, b) => b.cost - a.cost)[0];

  const roasChange = summary.changes.roas;
  const revenueChange = summary.changes.revenue;
  const costChange = summary.changes.cost;
  const conversionChange = summary.changes.conversions;

  return [
    {
      title: "전체 성과 요약",
      body:
        roasChange === null
          ? `이번 조회 기간의 총 광고비는 ${currency(summary.cost)}, 매출은 ${currency(summary.revenue)}이며 ROAS는 ${summary.roas}%입니다. 비교 가능한 직전 동일 기간 데이터가 충분하지 않아 이번 성과를 기준값으로 해석하는 편이 적절합니다.`
          : `이번 조회 기간의 총 광고비는 ${currency(summary.cost)}, 매출은 ${currency(summary.revenue)}, ROAS는 ${summary.roas}%입니다. 직전 동일 기간 대비 매출은 ${formatChange(revenueChange)}, 전환수는 ${formatChange(conversionChange)}, ROAS는 ${formatChange(roasChange)}로 확인됩니다.`
    },
    {
      title: "매체 운영 평가",
      body: bestPlatform
        ? `${bestPlatform.platform} 매체가 ROAS ${bestPlatform.roas}%로 가장 높은 효율을 보이고 있습니다. ${
            weakPlatform && weakPlatform.platform !== bestPlatform.platform
              ? `${weakPlatform.platform}는 ROAS ${weakPlatform.roas}% 수준으로 상대적으로 낮아 예산 재배분 또는 소재/랜딩 점검이 필요해 보입니다.`
              : "현재 효율 좋은 매체 중심 운영 기조를 유지하면서 추가 확장 가능성을 검토해볼 수 있습니다."
          }`
        : "매체별 성과를 비교할 만큼 집계 데이터가 충분하지 않습니다."
    },
    {
      title: "캠페인 성과 해석",
      body: topCampaign
        ? `${topCampaign.campaignName} 캠페인이 ROAS ${topCampaign.roas}%로 가장 우수한 흐름을 보입니다. ${
            lowCampaign && lowCampaign.campaignName !== topCampaign.campaignName
              ? `${lowCampaign.campaignName} 캠페인은 ROAS ${lowCampaign.roas}%로 상대적으로 낮아 타겟, 소재, 랜딩 구조를 우선적으로 다시 점검하는 편이 좋겠습니다.`
              : "상위 캠페인의 효율이 안정적으로 유지되고 있어 예산 확대 테스트를 검토할 수 있습니다."
          }`
        : "캠페인 단위 평가를 진행할 만큼 데이터가 충분하지 않습니다."
    },
    {
      title: "다음 운영 제안",
      body: highSpendLowReturn
        ? `${highSpendLowReturn.campaignName} 캠페인은 광고비 ${currency(highSpendLowReturn.cost)} 집행 대비 ROAS ${highSpendLowReturn.roas}%로 확인됩니다. ${
            costChange !== null && revenueChange !== null && costChange > revenueChange
              ? "현재는 비용 증가 속도가 매출 증가보다 빠른 구간으로 보여, 저효율 캠페인 정리와 고효율 매체 재배분을 먼저 검토하는 쪽이 적절합니다."
              : "저효율 구간을 정리하면서 상위 ROAS 캠페인에 예산을 재배치하면 전체 수익성 개선 여지가 있어 보입니다."
          }`
        : "고비용 저효율 캠페인이 뚜렷하지 않아, 상위 성과 캠페인 확장과 신규 소재 테스트를 병행하는 방향이 적절해 보입니다."
    }
  ];
}

function formatChange(value: number | null) {
  if (value === null) return "비교 불가";
  if (value === 0) return "보합";
  return `${value > 0 ? "+" : ""}${value}%`;
}
