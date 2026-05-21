import type { UploadSourceDefinition } from "@/services/upload/types";

const commonOptional = {
  device: ["device", "디바이스", "기기", "노출기기"],
  keyword: ["keyword", "키워드", "검색어"],
  creative_name: ["creative_name", "creative name", "소재확장명", "크리에이티브명"],
  landing_page: ["landing_page", "landing page", "랜딩페이지", "url"],
  purchases: ["purchases", "purchase", "구매", "구매수", "구매건수"],
  leads: ["leads", "lead", "리드", "리드수", "문의수"],
  memo: ["memo", "메모", "비고"]
} as const;

export const uploadSources: UploadSourceDefinition[] = [
  {
    id: "naver_sa",
    label: "NAVER SA",
    platformValue: "NAVER",
    filenameHints: ["naver", "네이버", "검색어", "검색광고", "파워링크", "sa"],
    sheetHints: ["naver", "네이버", "검색광고"],
    aliases: {
      date: ["date", "일자", "날짜", "일별"],
      platform: ["platform", "매체", "광고매체"],
      campaign_name: ["campaign_name", "campaign", "캠페인", "캠페인명"],
      ad_group_name: ["ad_group_name", "adgroup", "광고그룹", "광고그룹명"],
      ad_name: ["ad_name", "ad", "소재", "소재명", "광고명"],
      impressions: ["impressions", "노출", "노출수"],
      clicks: ["clicks", "클릭", "클릭수"],
      cost: ["cost", "광고비", "비용", "총비용"],
      conversions: ["conversions", "전환", "전환수", "구매완료 수", "구매완료수", "구매완료 전환수", "구매완료전환수"],
      revenue: [
        "revenue",
        "매출",
        "전환매출",
        "구매완료 전환매출액",
        "구매완료전환매출액",
        "구매완료 전환매출액(원)",
        "구매완료전환매출액원"
      ],
      ...commonOptional
    },
    duplicateAliases: {
      keyword: ["검색어"]
    },
    optionalTargets: ["conversions", "revenue", "purchases", "leads", "device", "keyword", "creative_name", "landing_page", "memo"]
  },
  {
    id: "naver_gfa",
    label: "NAVER GFA",
    platformValue: "NAVER",
    filenameHints: ["naver", "네이버", "gfa", "성과형", "디스플레이"],
    sheetHints: ["gfa", "네이버", "성과형"],
    aliases: {
      date: ["date", "일자", "날짜", "기간"],
      platform: ["platform", "매체", "광고매체"],
      campaign_name: ["campaign_name", "campaign", "캠페인", "캠페인명", "캠페인 이름"],
      ad_group_name: ["ad_group_name", "광고그룹", "광고그룹명", "광고 그룹 이름", "그룹명"],
      ad_name: ["ad_name", "광고 소재 이름", "광고소재이름", "광고 소재", "광고소재명", "소재명"],
      impressions: ["impressions", "노출", "노출수"],
      clicks: ["clicks", "클릭", "클릭수"],
      cost: ["cost", "광고비", "비용", "총비용"],
      conversions: ["conversions", "전환", "전환수", "구매완료 수", "구매완료수"],
      revenue: ["revenue", "매출", "전환매출", "구매완료 전환매출액", "구매완료전환매출액"],
      ...commonOptional
    },
    optionalTargets: ["conversions", "revenue", "purchases", "leads", "device", "creative_name", "landing_page", "memo"]
  },
  {
    id: "daangn_ads",
    label: "Daangn Ads",
    platformValue: "DAANGN",
    filenameHints: ["daangn", "당근"],
    sheetHints: ["daangn", "당근"],
    aliases: {
      date: ["date", "일자", "날짜"],
      platform: ["platform", "매체"],
      campaign_name: ["campaign_name", "campaign", "캠페인", "캠페인명"],
      ad_group_name: ["ad_group_name", "광고그룹", "광고그룹명", "그룹명"],
      ad_name: ["ad_name", "소재", "소재명", "광고명"],
      impressions: ["impressions", "노출", "노출수"],
      clicks: ["clicks", "클릭", "클릭수"],
      cost: ["cost", "광고비", "소진금액", "집행금액", "비용"],
      conversions: ["conversions", "전환", "전환수", "문의", "문의수"],
      revenue: ["revenue", "매출", "구매금액", "전환가치"],
      ...commonOptional
    },
    optionalTargets: ["conversions", "revenue", "purchases", "leads", "device", "keyword", "creative_name", "landing_page", "memo"]
  },
  {
    id: "kakao_moment",
    label: "Kakao Moment",
    platformValue: "KAKAO",
    filenameHints: ["kakao", "카카오", "moment"],
    sheetHints: ["kakao", "카카오"],
    aliases: {
      date: ["date", "일자", "날짜"],
      platform: ["platform", "매체"],
      campaign_name: ["campaign_name", "campaign", "캠페인", "캠페인명"],
      ad_group_name: ["ad_group_name", "광고그룹", "광고그룹명", "adgroup"],
      ad_name: ["ad_name", "소재", "소재명", "creative"],
      impressions: ["impressions", "노출", "노출수"],
      clicks: ["clicks", "클릭", "클릭수"],
      cost: ["cost", "광고비", "소진비용", "비용"],
      conversions: ["conversions", "전환", "전환수", "구매", "구매수"],
      revenue: ["revenue", "매출", "구매금액", "전환가치"],
      ...commonOptional
    },
    optionalTargets: ["conversions", "revenue", "purchases", "leads", "device", "keyword", "creative_name", "landing_page", "memo"]
  },
  {
    id: "meta_ads",
    label: "Meta Ads",
    platformValue: "META",
    filenameHints: ["meta", "facebook", "instagram", "페이스북", "인스타"],
    sheetHints: ["meta", "facebook", "instagram"],
    aliases: {
      date: ["date", "date_start", "reporting starts", "day", "일자", "날짜"],
      platform: ["platform", "publisher platform", "매체"],
      campaign_name: ["campaign_name", "campaign name", "campaign", "캠페인명"],
      ad_group_name: ["ad_group_name", "ad set name", "ad set", "광고세트명", "광고세트"],
      ad_name: ["ad_name", "ad name", "ad", "광고이름", "광고명"],
      impressions: ["impressions", "노출", "노출수"],
      clicks: ["clicks", "link clicks", "클릭", "클릭수"],
      cost: ["cost", "amount spent (krw)", "amount spent", "spend", "지출금액", "광고비"],
      conversions: ["conversions", "results", "purchases", "구매", "전환", "전환수"],
      revenue: ["revenue", "purchase conversion value", "website purchase conversion value", "구매전환값", "전환가치", "매출"],
      ...commonOptional
    },
    optionalTargets: ["platform", "conversions", "revenue", "purchases", "leads", "device", "keyword", "creative_name", "landing_page", "memo"]
  },
  {
    id: "google_ads",
    label: "Google Ads",
    platformValue: "GOOGLE",
    filenameHints: ["google", "구글", "ads", "gads"],
    sheetHints: ["google", "ads"],
    aliases: {
      date: ["date", "day", "일자", "날짜"],
      platform: ["platform", "network", "매체"],
      campaign_name: ["campaign_name", "campaign", "campaign name", "캠페인", "캠페인명"],
      ad_group_name: ["ad_group_name", "ad group", "ad group name", "광고그룹", "광고그룹명"],
      ad_name: ["ad_name", "ad name", "creative", "광고명", "소재명"],
      impressions: ["impressions", "impr.", "노출", "노출수"],
      clicks: ["clicks", "클릭", "클릭수"],
      cost: ["cost", "광고비", "비용"],
      conversions: ["conversions", "all conv.", "전환", "전환수"],
      revenue: ["revenue", "conv. value", "conversion value", "전환가치", "매출"],
      ...commonOptional
    },
    optionalTargets: ["platform", "conversions", "revenue", "purchases", "leads", "device", "keyword", "creative_name", "landing_page", "memo"]
  },
  {
    id: "generic",
    label: "Generic",
    platformValue: "",
    filenameHints: [],
    sheetHints: [],
    aliases: {
      date: ["date", "day", "일자", "날짜"],
      platform: ["platform", "media", "channel", "매체", "매체명"],
      campaign_name: ["campaign_name", "campaign", "campaignname", "캠페인", "캠페인명"],
      ad_group_name: ["ad_group_name", "adgroup", "adgroupname", "ad_group", "광고그룹", "광고그룹명"],
      ad_name: ["ad_name", "ad", "adname", "creative", "소재", "소재명"],
      impressions: ["impressions", "impression", "노출", "노출수"],
      clicks: ["clicks", "click", "클릭", "클릭수"],
      cost: ["cost", "spend", "amountspent", "광고비", "비용"],
      conversions: ["conversions", "conversion", "conv", "전환", "전환수"],
      revenue: ["revenue", "sales", "purchasevalue", "매출", "매출액"],
      ...commonOptional
    },
    optionalTargets: ["device", "keyword", "creative_name", "landing_page", "purchases", "leads", "memo"]
  }
];
