import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { format, subDays } from "date-fns";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const platforms = ["NAVER", "GOOGLE", "META", "KAKAO"];
const campaigns = ["Brand Search", "Lead Gen", "Retargeting", "Promotion", "Content Traffic", "Purchase Conversion"];
const groups = ["Core Keywords", "Competitor", "Interest", "Cart", "New Customer", "High Value", "Mobile", "PC", "Local Target", "Lookalike"];
const ads = Array.from({ length: 24 }, (_, index) => `Creative ${String(index + 1).padStart(2, "0")}`);

function makeRows(clientId: string) {
  const rows = [];

  for (let day = 59; day >= 0; day -= 1) {
    const date = format(subDays(new Date(), day), "yyyy-MM-dd");

    for (const platform of platforms) {
      for (let i = 0; i < 4; i += 1) {
        const campaign = campaigns[(day + i) % campaigns.length];
        const adGroup = groups[(day + i + platforms.indexOf(platform)) % groups.length];
        const ad = ads[(day * i + platforms.indexOf(platform) + i) % ads.length];
        const impressions = 2500 + day * 35 + i * 420 + platforms.indexOf(platform) * 260;
        const clicks = Math.round(impressions * (0.018 + i * 0.003));
        const cost = Math.round(clicks * (520 + i * 95 + platforms.indexOf(platform) * 40));
        const conversions = Number((clicks * (0.025 + i * 0.006)).toFixed(1));
        const revenue = Math.round(conversions * (42000 + i * 8500));

        rows.push({
          clientId,
          date: new Date(`${date}T00:00:00.000Z`),
          platform,
          campaignName: campaign,
          adGroupName: adGroup,
          adName: ad,
          device: i % 2 === 0 ? "mobile" : "desktop",
          keyword: platform === "NAVER" || platform === "GOOGLE" ? `${campaign} keyword` : null,
          creativeName: ad,
          landingPage: `https://example.com/${campaign.replaceAll(" ", "-")}`,
          impressions,
          clicks,
          cost,
          conversions,
          revenue,
          purchases: Number((conversions * 0.6).toFixed(1)),
          leads: Number((conversions * 0.4).toFixed(1)),
          memo: ""
        });
      }
    }
  }

  return rows;
}

async function main() {
  const passwordHash = await bcrypt.hash("admin1234", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { passwordHash },
    create: { email: "admin@example.com", name: "관리자", passwordHash, role: "ADMIN" }
  });

  const clients = await Promise.all([
    prisma.client.upsert({
      where: { slug: "progressmedia" },
      update: {},
      create: {
        name: "Progress Media",
        slug: "progressmedia",
        logoUrl: "https://dummyimage.com/180x60/1d4ed8/ffffff&text=Progress",
        isPasswordProtected: false
      }
    }),
    prisma.client.upsert({
      where: { slug: "sample-client" },
      update: {},
      create: {
        name: "Sample Client",
        slug: "sample-client",
        logoUrl: "https://dummyimage.com/180x60/0f172a/ffffff&text=Sample",
        isPasswordProtected: false
      }
    })
  ]);

  for (const client of clients) {
    const rows = makeRows(client.id);
    const upload = await prisma.uploadHistory.create({
      data: { clientId: client.id, fileName: "seed-sample.csv", rowCount: rows.length, status: "SUCCESS" }
    });

    for (const row of rows) {
      await prisma.campaignReport.upsert({
        where: {
          clientId_date_platform_campaignName_adGroupName_adName: {
            clientId: row.clientId,
            date: row.date,
            platform: row.platform,
            campaignName: row.campaignName,
            adGroupName: row.adGroupName,
            adName: row.adName
          }
        },
        update: { ...row, uploadId: upload.id },
        create: { ...row, uploadId: upload.id }
      });
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
