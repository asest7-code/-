"use client";

import type { DashboardPayload } from "@/types/dashboard";
import { currency } from "@/utils/metrics";

export function DashboardInsights({ payload }: { payload: DashboardPayload }) {
  const insights = buildInsights(payload);

  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-bold text-slate-950">데이터 인사이트</h2>
        <p className="text-sm text-slate-500">현재 선택한 기간과 필터 조건을 기준으로 실무형 보고서 톤에 맞춰 자동 정리한 코멘트입니다.</p>
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

function buildInsights(payload: DashboardPayload) {
  const bestPlatform = [...payload.platformBreakdown].sort((a, b) => b.roas - a.roas)[0];
  const weakPlatform = [...payload.platformBreakdown].sort((a, b) => a.roas - b.roas)[0];
  const topCampaign = payload.campaignRankings[0];
  const lowCampaign = [...payload.campaignRankings].sort((a, b) => a.roas - b.roas)[0];
  const highSpendLowReturn = [...payload.campaignRankings].filter((row) => row.cost > 0 && row.roas <= 100).sort((a, b) => b.cost - a.cost)[0];

  const roasChange = payload.summary.changes.roas;
  const revenueChange = payload.summary.changes.revenue;
  const costChange = payload.summary.changes.cost;
  const conversionChange = payload.summary.changes.conversions;

  return [
    {
      title: "전체 성과 요약",
      body:
        roasChange === null
          ? `이번 조회 구간의 총 광고비는 ${currency(payload.summary.cost)}원, 매출은 ${currency(payload.summary.revenue)}원이며, ROAS는 ${payload.summary.roas}%입니다. 비교 가능한 이전 동일 기간 데이터가 충분하지 않아 이번 성과를 기준선으로 해석하는 것이 적절합니다.`
          : `이번 조회 구간의 총 광고비는 ${currency(payload.summary.cost)}원, 매출은 ${currency(payload.summary.revenue)}원, ROAS는 ${payload.summary.roas}%입니다. 직전 동일 기간 대비 매출은 ${formatChange(
              revenueChange
            )}, 전환수는 ${formatChange(conversionChange)}, ROAS는 ${formatChange(roasChange)}로 확인됩니다.`
    },
    {
      title: "매체 운영 평가",
      body: bestPlatform
        ? `${bestPlatform.platform} 매체가 ROAS ${bestPlatform.roas}%로 가장 높은 효율을 기록했습니다. ${
            weakPlatform && weakPlatform.platform !== bestPlatform.platform
              ? `${weakPlatform.platform}는 ROAS ${weakPlatform.roas}% 수준으로 상대적으로 낮아, 예산 유지 여부와 타겟 구성을 함께 점검할 필요가 있습니다.`
              : "현재는 효율 매체 중심의 운영 기조를 유지하면서 추가 확장 가능성을 검토할 수 있습니다."
          }`
        : "매체별 성과를 비교할 수 있을 만큼 집계된 데이터가 아직 충분하지 않습니다."
    },
    {
      title: "캠페인 성과 해석",
      body: topCampaign
        ? `${topCampaign.campaignName} 캠페인이 ROAS ${topCampaign.roas}%로 가장 우수한 흐름을 보이고 있습니다. ${
            lowCampaign && lowCampaign.campaignName !== topCampaign.campaignName
              ? `${lowCampaign.campaignName} 캠페인은 ROAS ${lowCampaign.roas}%로 상대적으로 낮아, 소재 피로도나 랜딩 전환 구조를 우선적으로 확인하는 편이 좋겠습니다.`
              : "상위 캠페인의 성과가 안정적으로 유지되고 있어 예산 확대 테스트 후보로 볼 수 있습니다."
          }`
        : "캠페인 단위 해석을 진행할 만큼의 데이터가 아직 충분하지 않습니다."
    },
    {
      title: "다음 운영 제안",
      body: highSpendLowReturn
        ? `${highSpendLowReturn.campaignName} 캠페인은 광고비 ${currency(highSpendLowReturn.cost)}원 집행 대비 ROAS ${highSpendLowReturn.roas}% 수준으로 확인됩니다. ${
            costChange !== null && revenueChange !== null && costChange > revenueChange
              ? "현재는 비용 증가 폭이 매출 증가 폭보다 큰 구간이므로, 저효율 캠페인 정리와 효율 매체 재배분을 먼저 진행하는 접근이 적절합니다."
              : "저효율 구간을 정리하면서 상위 ROAS 캠페인에 예산을 재배치하는 방식이 전체 수익성 개선에 유리해 보입니다."
          }`
        : "뚜렷한 고비용 저효율 캠페인이 크지 않아, 당분간은 상위 성과 캠페인의 확장 테스트와 신규 소재 실험을 병행하는 흐름이 적절해 보입니다."
    }
  ];
}

function formatChange(value: number | null) {
  if (value === null) return "비교 불가";
  if (value === 0) return "보합";
  return `${value > 0 ? "+" : ""}${value}%`;
}
