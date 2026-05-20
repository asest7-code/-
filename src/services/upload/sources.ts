import type { UploadSourceDefinition } from "@/services/upload/types";

const commonOptional = {
  device: ["device", "\uB514\uBC14\uC774\uC2A4", "\uAE30\uAE30", "\uB178\uCD9C\uAE30\uAE30"],
  keyword: ["keyword", "\uD0A4\uC6CC\uB4DC"],
  creative_name: ["creative_name", "creative name", "\uC18C\uC7AC\uD655\uC7A5\uBA85", "\uD06C\uB9AC\uC5D0\uC774\uD2F0\uBE0C\uBA85"],
  landing_page: ["landing_page", "landing page", "\uB79C\uB529\uD398\uC774\uC9C0", "url"],
  purchases: ["purchases", "purchase", "\uAD6C\uB9E4", "\uAD6C\uB9E4\uC218", "\uAD6C\uB9E4\uAC74\uC218"],
  leads: ["leads", "lead", "\uB9AC\uB4DC", "\uB9AC\uB4DC\uC218"],
  memo: ["memo", "\uBA54\uBAA8", "\uBE44\uACE0"]
} as const;

export const uploadSources: UploadSourceDefinition[] = [
  {
    id: "naver",
    label: "NAVER Ads",
    platformValue: "NAVER",
    filenameHints: ["naver", "\uB124\uC774\uBC84", "\uAC80\uC0C9\uC5B4", "sa", "gfa"],
    sheetHints: ["naver", "\uB124\uC774\uBC84"],
    aliases: {
      date: ["date", "\uC77C\uC790", "\uB0A0\uC9DC", "\uC77C\uBCC4"],
      platform: ["platform", "\uB9E4\uCCB4", "\uAD11\uACE0\uB9E4\uCCB4"],
      campaign_name: ["campaign_name", "campaign", "\uCEA0\uD398\uC778", "\uCEA0\uD398\uC778\uBA85"],
      ad_group_name: ["ad_group_name", "adgroup", "\uAD11\uACE0\uADF8\uB8F9", "\uAD11\uACE0\uADF8\uB8F9\uBA85", "\uADF8\uB8F9\uBA85"],
      ad_name: ["ad_name", "ad", "\uC18C\uC7AC", "\uC18C\uC7AC\uBA85", "\uAD11\uACE0\uBA85", "\uAC80\uC0C9\uC5B4"],
      impressions: ["impressions", "\uB178\uCD9C", "\uB178\uCD9C\uC218"],
      clicks: ["clicks", "\uD074\uB9AD", "\uD074\uB9AD\uC218"],
      cost: ["cost", "\uAD11\uACE0\uBE44", "\uBE44\uC6A9", "\uCD1D\uBE44\uC6A9"],
      conversions: [
        "conversions",
        "\uC804\uD658",
        "\uC804\uD658\uC218",
        "\uAD6C\uB9E4\uC644\uB8CC \uC804\uD658\uC218",
        "\uAD6C\uB9E4\uC644\uB8CC\uC804\uD658\uC218"
      ],
      revenue: [
        "revenue",
        "\uB9E4\uCD9C",
        "\uC804\uD658\uB9E4\uCD9C",
        "\uAD6C\uB9E4\uC644\uB8CC \uC804\uD658\uB9E4\uCD9C\uC561(\uC6D0)",
        "\uAD6C\uB9E4\uC644\uB8CC\uC804\uD658\uB9E4\uCD9C\uC561\uC6D0",
        "\uAD6C\uB9E4\uC644\uB8CC \uC804\uD658\uB9E4\uCD9C\uC561",
        "\uAD6C\uB9E4\uC644\uB8CC\uC804\uD658\uB9E4\uCD9C\uC561"
      ],
      ...commonOptional
    },
    duplicateAliases: {
      keyword: ["\uAC80\uC0C9\uC5B4"]
    },
    optionalTargets: ["conversions", "revenue", "purchases", "leads", "device", "keyword", "creative_name", "landing_page", "memo"]
  },
  {
    id: "daangn",
    label: "Daangn Ads",
    platformValue: "DAANGN",
    filenameHints: ["daangn", "\uB2F9\uADFC"],
    sheetHints: ["daangn", "\uB2F9\uADFC"],
    aliases: {
      date: ["date", "\uC77C\uC790", "\uB0A0\uC9DC"],
      platform: ["platform", "\uB9E4\uCCB4"],
      campaign_name: ["campaign_name", "campaign", "\uCEA0\uD398\uC778", "\uCEA0\uD398\uC778\uBA85"],
      ad_group_name: ["ad_group_name", "\uAD11\uACE0\uADF8\uB8F9", "\uAD11\uACE0\uADF8\uB8F9\uBA85", "\uADF8\uB8F9\uBA85"],
      ad_name: ["ad_name", "\uC18C\uC7AC", "\uC18C\uC7AC\uBA85", "\uAD11\uACE0\uBA85"],
      impressions: ["impressions", "\uB178\uCD9C", "\uB178\uCD9C\uC218"],
      clicks: ["clicks", "\uD074\uB9AD", "\uD074\uB9AD\uC218"],
      cost: ["cost", "\uAD11\uACE0\uBE44", "\uC18C\uC9C4\uAE08\uC561", "\uC9D1\uD589\uAE08\uC561", "\uBE44\uC6A9"],
      conversions: ["conversions", "\uC804\uD658", "\uC804\uD658\uC218", "\uBB38\uC758", "\uBB38\uC758\uC218"],
      revenue: ["revenue", "\uB9E4\uCD9C", "\uAD6C\uB9E4\uAE08\uC561", "\uC804\uD658\uAC00\uCE58"],
      ...commonOptional
    },
    optionalTargets: ["conversions", "revenue", "purchases", "leads", "device", "keyword", "creative_name", "landing_page", "memo"]
  },
  {
    id: "kakao",
    label: "Kakao Ads",
    platformValue: "KAKAO",
    filenameHints: ["kakao", "\uCE74\uCE74\uC624", "moment"],
    sheetHints: ["kakao", "\uCE74\uCE74\uC624"],
    aliases: {
      date: ["date", "\uC77C\uC790", "\uB0A0\uC9DC"],
      platform: ["platform", "\uB9E4\uCCB4"],
      campaign_name: ["campaign_name", "campaign", "\uCEA0\uD398\uC778", "\uCEA0\uD398\uC778\uBA85"],
      ad_group_name: ["ad_group_name", "\uAD11\uACE0\uADF8\uB8F9", "\uAD11\uACE0\uADF8\uB8F9\uBA85", "adgroup"],
      ad_name: ["ad_name", "\uC18C\uC7AC", "\uC18C\uC7AC\uBA85", "creative"],
      impressions: ["impressions", "\uB178\uCD9C", "\uB178\uCD9C\uC218"],
      clicks: ["clicks", "\uD074\uB9AD", "\uD074\uB9AD\uC218"],
      cost: ["cost", "\uAD11\uACE0\uBE44", "\uC18C\uC9C4\uBE44\uC6A9", "\uBE44\uC6A9"],
      conversions: ["conversions", "\uC804\uD658", "\uC804\uD658\uC218", "\uAD6C\uB9E4", "\uAD6C\uB9E4\uC218"],
      revenue: ["revenue", "\uB9E4\uCD9C", "\uAD6C\uB9E4\uAE08\uC561", "\uC804\uD658\uAC00\uCE58"],
      ...commonOptional
    },
    optionalTargets: ["conversions", "revenue", "purchases", "leads", "device", "keyword", "creative_name", "landing_page", "memo"]
  },
  {
    id: "meta",
    label: "Meta Ads",
    platformValue: "META",
    filenameHints: ["meta", "facebook", "instagram", "\uD398\uC774\uC2A4\uBD81", "\uC778\uC2A4\uD0C0"],
    sheetHints: ["meta", "facebook", "instagram"],
    aliases: {
      date: ["date", "reporting starts", "day", "\uC77C\uC790", "\uB0A0\uC9DC"],
      platform: ["platform", "publisher platform", "\uB9E4\uCCB4"],
      campaign_name: ["campaign_name", "campaign name", "campaign", "\uCEA0\uD398\uC778\uBA85"],
      ad_group_name: ["ad_group_name", "ad set name", "ad set", "\uAD11\uACE0\uC138\uD2B8\uBA85", "\uAD11\uACE0\uC138\uD2B8"],
      ad_name: ["ad_name", "ad name", "ad", "\uAD11\uACE0\uC774\uB984", "\uAD11\uACE0\uBA85"],
      impressions: ["impressions", "\uB178\uCD9C", "\uB178\uCD9C\uC218"],
      clicks: ["clicks", "link clicks", "\uD074\uB9AD", "\uD074\uB9AD\uC218"],
      cost: ["cost", "amount spent (krw)", "amount spent", "spend", "\uC9C0\uCD9C\uAE08\uC561", "\uAD11\uACE0\uBE44"],
      conversions: ["conversions", "results", "purchases", "\uAD6C\uB9E4", "\uC804\uD658", "\uC804\uD658\uC218"],
      revenue: ["revenue", "purchase conversion value", "website purchase conversion value", "\uAD6C\uB9E4\uC804\uD658\uAC12", "\uC804\uD658\uAC00\uCE58", "\uB9E4\uCD9C"],
      ...commonOptional
    },
    optionalTargets: ["platform", "conversions", "revenue", "purchases", "leads", "device", "keyword", "creative_name", "landing_page", "memo"]
  },
  {
    id: "google",
    label: "Google Ads",
    platformValue: "GOOGLE",
    filenameHints: ["google", "\uAD6C\uAE00", "ads", "gads"],
    sheetHints: ["google", "ads"],
    aliases: {
      date: ["date", "day", "\uC77C\uC790", "\uB0A0\uC9DC"],
      platform: ["platform", "network", "\uB9E4\uCCB4"],
      campaign_name: ["campaign_name", "campaign", "campaign name", "\uCEA0\uD398\uC778", "\uCEA0\uD398\uC778\uBA85"],
      ad_group_name: ["ad_group_name", "ad group", "ad group name", "\uAD11\uACE0\uADF8\uB8F9", "\uAD11\uACE0\uADF8\uB8F9\uBA85"],
      ad_name: ["ad_name", "ad name", "creative", "\uAD11\uACE0\uBA85", "\uC18C\uC7AC\uBA85"],
      impressions: ["impressions", "impr.", "\uB178\uCD9C", "\uB178\uCD9C\uC218"],
      clicks: ["clicks", "\uD074\uB9AD", "\uD074\uB9AD\uC218"],
      cost: ["cost", "cost / conv.", "\uAD11\uACE0\uBE44", "\uBE44\uC6A9"],
      conversions: ["conversions", "all conv.", "\uC804\uD658", "\uC804\uD658\uC218"],
      revenue: ["revenue", "conv. value", "conversion value", "\uC804\uD658\uAC00\uCE58", "\uB9E4\uCD9C"],
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
      date: ["date", "day", "\uC77C\uC790", "\uB0A0\uC9DC"],
      platform: ["platform", "media", "channel", "\uB9E4\uCCB4", "\uB9E4\uCCB4\uBA85"],
      campaign_name: ["campaign_name", "campaign", "campaignname", "\uCEA0\uD398\uC778", "\uCEA0\uD398\uC778\uBA85"],
      ad_group_name: ["ad_group_name", "adgroup", "adgroupname", "ad_group", "\uAD11\uACE0\uADF8\uB8F9", "\uAD11\uACE0\uADF8\uB8F9\uBA85"],
      ad_name: ["ad_name", "ad", "adname", "creative", "\uC18C\uC7AC", "\uC18C\uC7AC\uBA85"],
      impressions: ["impressions", "impression", "\uB178\uCD9C", "\uB178\uCD9C\uC218"],
      clicks: ["clicks", "click", "\uD074\uB9AD", "\uD074\uB9AD\uC218"],
      cost: ["cost", "spend", "amountspent", "\uAD11\uACE0\uBE44", "\uBE44\uC6A9"],
      conversions: ["conversions", "conversion", "conv", "\uC804\uD658", "\uC804\uD658\uC218"],
      revenue: ["revenue", "sales", "purchasevalue", "\uB9E4\uCD9C", "\uB9E4\uCD9C\uC561"],
      ...commonOptional
    },
    optionalTargets: ["device", "keyword", "creative_name", "landing_page", "purchases", "leads", "memo"]
  }
];
