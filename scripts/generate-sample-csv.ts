import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format, subDays } from "date-fns";

const platforms = ["NAVER", "GOOGLE", "META", "KAKAO"];
const campaigns = ["브랜드 검색", "리드 확보", "리타겟팅", "프로모션", "콘텐츠 유입", "구매 전환"];
const groups = ["핵심 키워드", "경쟁사", "관심사", "장바구니", "신규 고객", "고가치 고객", "모바일", "PC", "지역 타겟", "유사 타겟"];
const ads = Array.from({ length: 24 }, (_, index) => `소재 ${String(index + 1).padStart(2, "0")}`);
const headers = [
  "date",
  "platform",
  "campaign_name",
  "ad_group_name",
  "ad_name",
  "impressions",
  "clicks",
  "cost",
  "conversions",
  "revenue",
  "device",
  "keyword",
  "creative_name",
  "landing_page",
  "purchases",
  "leads",
  "memo"
];

const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const lines = [headers.join(",")];

for (let day = 59; day >= 0; day -= 1) {
  const date = format(subDays(new Date(), day), "yyyy-MM-dd");
  for (const platform of platforms) {
    for (let i = 0; i < 4; i += 1) {
      const campaign = campaigns[(day + i) % campaigns.length];
      const group = groups[(day + i + platforms.indexOf(platform)) % groups.length];
      const ad = ads[(day * i + platforms.indexOf(platform) + i) % ads.length];
      const impressions = 2500 + day * 35 + i * 420 + platforms.indexOf(platform) * 260;
      const clicks = Math.round(impressions * (0.018 + i * 0.003));
      const cost = Math.round(clicks * (520 + i * 95 + platforms.indexOf(platform) * 40));
      const conversions = Number((clicks * (0.025 + i * 0.006)).toFixed(1));
      const revenue = Math.round(conversions * (42000 + i * 8500));
      lines.push(
        [
          date,
          platform,
          campaign,
          group,
          ad,
          impressions,
          clicks,
          cost,
          conversions,
          revenue,
          i % 2 === 0 ? "mobile" : "desktop",
          platform === "NAVER" || platform === "GOOGLE" ? `${campaign} 키워드` : "",
          ad,
          `https://example.com/${campaign.replaceAll(" ", "-")}`,
          Number((conversions * 0.6).toFixed(1)),
          Number((conversions * 0.4).toFixed(1)),
          ""
        ]
          .map(escape)
          .join(",")
      );
    }
  }
}

mkdirSync("samples", { recursive: true });
writeFileSync(join("samples", "sample-ad-data.csv"), `\uFEFF${lines.join("\n")}`, "utf8");
console.log(`Generated samples/sample-ad-data.csv (${lines.length - 1} rows)`);
