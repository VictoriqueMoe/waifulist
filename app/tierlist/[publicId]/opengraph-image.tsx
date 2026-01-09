import { getAnonymousTierListByPublicId, getTierListByPublicId } from "@/lib/db";
import { getCharactersForTierList } from "@/services/anilistData";
import { REDIS_KEYS } from "@/lib/redis";
import { countCharacters, getPreviewCharacterIds, parseTierListData } from "@/services/tierListService";
import { createNotFoundResponse, createOGHash, generateOGImage, OG_SIZE, OG_THEMES } from "@/services/opengraphService";

export const size = OG_SIZE;

export default async function OGImage({ params }: { params: Promise<{ publicId: string }> }) {
    const { publicId } = await params;
    const row = getTierListByPublicId(publicId);
    const anonymousRow = !row ? getAnonymousTierListByPublicId(publicId) : null;

    if (!row && !anonymousRow) {
        return createNotFoundResponse("Tier List Not Found");
    }

    const sourceRow = row || anonymousRow!;
    const username = row ? row.username : "Anonymous";
    const data = parseTierListData(sourceRow.data);
    const characterCount = countCharacters(data);
    const previewIds = getPreviewCharacterIds(data, 5);

    const cacheHash = createOGHash(`tierlist:${sourceRow.name}:${characterCount}:${previewIds.join(",")}`);
    const cacheKey = REDIS_KEYS.OG_IMAGE(publicId, cacheHash);

    const characters = await getCharactersForTierList(previewIds);
    const images: string[] = [];
    for (const char of characters) {
        if (char.image) {
            images.push(char.image);
        }
    }

    return generateOGImage({
        id: publicId,
        images,
        theme: OG_THEMES.purple,
        label: "WaifuList Tier List",
        title: sourceRow.name,
        subtitle: `by ${username}`,
        stats: `${characterCount} characters ranked`,
        cacheKey,
    });
}
