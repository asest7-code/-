import type { BreakdownRow, DashboardSectionId, ExtendedComparisonSummary, InsightItem } from "@/types/dashboard";
import { KEYWORD_EXCLUSION_RULES } from "@/lib/dashboard/filters";
import { currency, formatNumber, formatPercent, formatRoas } from "@/utils/metrics";

export function buildSectionInsights(params: {
  section: DashboardSectionId;
  summary: ExtendedComparisonSummary;
  platformRows: BreakdownRow[];
  campaignRows: BreakdownRow[];
  creativeRows: BreakdownRow[];
  keywordRows: BreakdownRow[];
  landingRows: BreakdownRow[];
}): InsightItem[] {
  const { section, summary, platformRows, campaignRows, creativeRows, keywordRows, landingRows } = params;
  const insights: InsightItem[] = [];

  if (summary.clicks === 0 && summary.impressions === 0) {
    return [
      {
        id: "empty",
        title: "데이터 부족",
        body: "충분한 데이터가 없습니다.",
        tone: "neutral"
      }
    ];
  }

  insights.push({
    id: "overview",
    title: "전체 성과 요약",
    body: `이번 기간 총 광고비는 ${currency(summary.cost)}원, 클릭 ${formatNumber(summary.clicks)}건, 전환 ${formatNumber(summary.conversions)}건, 매출 ${currency(summary.revenue)}원, ROAS ${formatRoas(summary.roas)}입니다.`,
    tone: "neutral"
  });

  const bestPlatform = [...platformRows].sort((left, right) => right.metrics.roas - left.metrics.roas)[0];
  const biggestPlatform = [...platformRows].sort((left, right) => right.metrics.cost - left.metrics.cost)[0];
  if (bestPlatform) {
    insights.push({
      id: "platform-best",
      title: "효율이 좋은 매체",
      body: `${bestPlatform.label} 매체가 ROAS ${formatRoas(bestPlatform.metrics.roas)}로 가장 높은 효율을 보였습니다.${biggestPlatform ? ` 가장 많은 비용이 집행된 매체는 ${biggestPlatform.label}(${currency(biggestPlatform.metrics.cost)}원)입니다.` : ""}`,
      tone: "positive"
    });
  }

  const weakCampaign = [...campaignRows]
    .filter((row) => row.metrics.cost > 0)
    .sort((left, right) => right.metrics.cost - left.metrics.cost || left.metrics.roas - right.metrics.roas)[0];
  if (weakCampaign) {
    insights.push({
      id: "campaign-warning",
      title: "캠페인 점검 포인트",
      body: `${weakCampaign.label} 캠페인은 비용 ${currency(weakCampaign.metrics.cost)}원이 집행된 반면 ROAS ${formatRoas(weakCampaign.metrics.roas)}를 기록했습니다. 비용 비중이 높은 구간이라면 예산 대비 성과 점검이 필요합니다.`,
      tone: "warning"
    });
  }

  if (section === "keyword") {
    const averageCost = keywordRows.length > 0 ? keywordRows.reduce((sum, row) => sum + row.metrics.cost, 0) / keywordRows.length : 0;
    const negativeKeyword = keywordRows.find(
      (row) =>
        row.metrics.clicks >= KEYWORD_EXCLUSION_RULES.minClicks &&
        row.metrics.conversions <= KEYWORD_EXCLUSION_RULES.requiredConversions &&
        row.metrics.cost >= averageCost * KEYWORD_EXCLUSION_RULES.minCostVsAverageMultiplier
    );

    insights.push(
      negativeKeyword
        ? {
            id: "keyword-negative",
            title: "제외 키워드 후보",
            body: `${negativeKeyword.label} 키워드는 클릭 ${formatNumber(negativeKeyword.metrics.clicks)}건, 전환 0건, 비용 ${currency(negativeKeyword.metrics.cost)}원으로 집계되었습니다. 제외 키워드 후보로 검토할 수 있습니다.`,
            tone: "danger"
          }
        : {
            id: "keyword-negative",
            title: "제외 키워드 후보",
            body: "현재 조건에서 제외 키워드 후보로 볼 만한 데이터가 충분하지 않습니다.",
            tone: "neutral"
          }
    );
  }

  if (section === "creative") {
    const bestCreative = [...creativeRows].sort((left, right) => right.metrics.ctr - left.metrics.ctr)[0];
    if (bestCreative) {
      insights.push({
        id: "creative-best",
        title: "소재 인사이트",
        body: `${bestCreative.label} 소재는 CTR ${formatPercent(bestCreative.metrics.ctr, 1)}로 반응이 가장 좋았습니다. 메시지와 후킹 포인트를 확장 테스트하기 좋은 후보입니다.`,
        tone: "positive"
      });
    }
  }

  if (section === "landing") {
    const weakLanding = [...landingRows]
      .filter((row) => row.metrics.cost > 0)
      .sort((left, right) => right.metrics.cost - left.metrics.cost || left.metrics.cvr - right.metrics.cvr)[0];
    if (weakLanding) {
      insights.push({
        id: "landing-warning",
        title: "랜딩페이지 점검",
        body: `${weakLanding.label} 랜딩페이지는 비용 ${currency(weakLanding.metrics.cost)}원 대비 CVR ${formatPercent(weakLanding.metrics.cvr, 1)}를 기록했습니다. 유입 대비 전환 흐름을 점검해볼 필요가 있습니다.`,
        tone: "warning"
      });
    }
  }

  return insights.slice(0, 6);
}
