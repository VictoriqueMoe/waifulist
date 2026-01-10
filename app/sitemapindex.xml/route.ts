import { NextResponse } from "next/server";
import { getCharacterIds, getPeopleIds, getMangaIds } from "@/services/animeData";

export const dynamic = "force-dynamic";

export async function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost";

    const peopleIds = await getPeopleIds();
    const characterIds = await getCharacterIds();
    const mangaIds = await getMangaIds();
    const sitemapCount =
        Math.ceil(mangaIds.ids.length / 50000) +
        Math.ceil(characterIds.ids.length / 50000) +
        Math.ceil(peopleIds.ids.length / 50000) +
        1; // +1 for id=0 (anime+static)

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from({ length: sitemapCount }, (_, id) => {
    return `  <sitemap>
    <loc>${baseUrl}/sitemap/${id}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
}).join("\n")}
</sitemapindex>`;

    return new NextResponse(body, {
        headers: { "content-type": "application/xml; charset=utf-8" },
    });
}
