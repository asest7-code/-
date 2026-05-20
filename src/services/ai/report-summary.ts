import type { DashboardPayload } from "@/types/dashboard";
import { currency } from "@/utils/metrics";

export function generateReportSummary(payload: Pick<DashboardPayload, "summary" | "platformBreakdown" | "campaignRankings">) {
  const bestPlatform = [...payload.platformBreakdown].sort((a, b) => b.roas - a.roas)[0];
  const weakCampaign = [...payload.campaignRankings].sort((a, b) => a.roas - b.roas)[0];
  const topCampaign = [...payload.campaignRankings].sort((a, b) => b.roas - a.roas)[0];

  return [
    `이번 기간 총 광고비는 ${currency(payload.summary.cost)}원, 매출은 ${currency(payload.summary.revenue)}원이며 ROAS는 ${payload.summary.roas}%입니다.`,
    `전환수는 ${payload.summary.conversions.toLocaleString("ko-KR")}건이며 CPA는 ${currency(payload.summary.cpa)}원입니다.`,
    bestPlatform ? `${bestPlatform.platform} 매체가 ROAS ${bestPlatform.roas}%로 가장 안정적인 성과를 보였습니다.` : "매체별 성과 데이터가 아직 충분하지 않습니다.",
    topCampaign ? `${topCampaign.campaignName} 캠페인이 가장 높은 ROAS를 기록해 예산 확대 후보로 볼 수 있습니다.` : "상위 캠페인을 판단할 데이터가 부족합니다.",
    weakCampaign ? `${weakCampaign.campaignName} 캠페인은 ROAS가 낮아 소재, 타겟, 랜딩페이지 점검이 필요합니다.` : "개선이 필요한 캠페인은 아직 확인되지 않습니다."
  ].join("\n");
}
