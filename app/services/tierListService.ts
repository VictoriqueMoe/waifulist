import {
    createTierList,
    deleteTierList,
    getAnonymousTierListByPublicId,
    getPublicTierLists,
    getTierListByPublicId,
    getTierListsByUserId,
    PublicTierListSort,
    TierListRow,
    TierListWithUsername,
    updateTierList,
} from "@/lib/db";
import { getCharactersForTierList } from "@/services/anilistData";
import { TIER_RANKS, TierListCharacter, TierListData, TierListWithCharacters, TierRank } from "@/types/tierlist";

export interface TierListSummary {
    id: number;
    publicId: string;
    name: string;
    characterCount: number;
    isPublic: boolean;
    commentsEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TierListSummaryPublic extends TierListSummary {
    username: string;
    previewCharacterIds: number[];
}

function parseTierListData(dataString: string): TierListData {
    try {
        return JSON.parse(dataString) as TierListData;
    } catch {
        return { S: [], A: [], B: [], C: [], D: [], F: [] };
    }
}

function countCharacters(data: TierListData): number {
    let count = 0;
    for (const rank of TIER_RANKS) {
        count += data[rank].length;
    }
    return count;
}

function toSummary(row: TierListRow): TierListSummary {
    const data = parseTierListData(row.data);
    return {
        id: row.id,
        publicId: row.public_id,
        name: row.name,
        characterCount: countCharacters(data),
        isPublic: row.is_public === 1,
        commentsEnabled: row.comments_enabled === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function getPreviewCharacterIds(data: TierListData, limit: number = 5): number[] {
    const ids: number[] = [];
    for (const rank of TIER_RANKS) {
        for (const id of data[rank]) {
            ids.push(id);
            if (ids.length >= limit) {
                return ids;
            }
        }
    }
    return ids;
}

function toPublicSummary(row: TierListWithUsername): TierListSummaryPublic {
    const data = parseTierListData(row.data);
    return {
        id: row.id,
        publicId: row.public_id,
        name: row.name,
        characterCount: countCharacters(data),
        isPublic: row.is_public === 1,
        commentsEnabled: row.comments_enabled === 1,
        username: row.username,
        previewCharacterIds: getPreviewCharacterIds(data),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function getUserTierLists(userId: number): TierListSummary[] {
    const rows = getTierListsByUserId(userId);
    return rows.map(toSummary);
}

export function createUserTierList(userId: number, name?: string): TierListSummary {
    const row = createTierList(userId, name);
    return toSummary(row);
}

export function deleteUserTierList(id: number, userId: number): boolean {
    return deleteTierList(id, userId);
}

export function updateUserTierList(
    id: number,
    userId: number,
    updates: { name?: string; data?: TierListData; isPublic?: boolean; commentsEnabled?: boolean },
): TierListSummary {
    const dbUpdates: { name?: string; data?: string; is_public?: number; comments_enabled?: number } = {};
    if (updates.name !== undefined) {
        dbUpdates.name = updates.name;
    }
    if (updates.data !== undefined) {
        dbUpdates.data = JSON.stringify(updates.data);
    }
    if (updates.isPublic !== undefined) {
        dbUpdates.is_public = updates.isPublic ? 1 : 0;
    }
    if (updates.commentsEnabled !== undefined) {
        dbUpdates.comments_enabled = updates.commentsEnabled ? 1 : 0;
    }
    const row = updateTierList(id, userId, dbUpdates);
    return toSummary(row);
}

export async function getTierListWithCharacters(publicId: string): Promise<TierListWithCharacters | null> {
    const row = getTierListByPublicId(publicId);
    const anonymousRow = !row ? getAnonymousTierListByPublicId(publicId) : null;

    if (!row && !anonymousRow) {
        return null;
    }

    const sourceRow = row || anonymousRow!;
    const data = parseTierListData(sourceRow.data);
    const allIds: number[] = [];
    for (const rank of TIER_RANKS) {
        for (const id of data[rank]) {
            allIds.push(id);
        }
    }

    const characters = await getCharactersForTierList(allIds);
    const characterMap = new Map<number, TierListCharacter>();
    for (const char of characters) {
        characterMap.set(char.anilistId, char);
    }

    const tiers: Record<TierRank, TierListCharacter[]> = {
        S: [],
        A: [],
        B: [],
        C: [],
        D: [],
        F: [],
    };

    for (const rank of TIER_RANKS) {
        for (const id of data[rank]) {
            const char = characterMap.get(id);
            if (char) {
                tiers[rank].push(char);
            }
        }
    }

    if (row) {
        return {
            id: row.id,
            publicId: row.public_id,
            name: row.name,
            userId: row.user_id,
            username: row.username,
            tiers,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    return {
        id: anonymousRow!.id,
        publicId: anonymousRow!.public_id,
        name: anonymousRow!.name,
        userId: null,
        username: "Anonymous",
        tiers,
        createdAt: anonymousRow!.created_at,
        updatedAt: anonymousRow!.created_at,
    };
}

export function getTierListRawData(publicId: string): { row: TierListWithUsername; data: TierListData } | null {
    const row = getTierListByPublicId(publicId);
    if (!row) {
        return null;
    }
    return {
        row,
        data: parseTierListData(row.data),
    };
}

export interface BrowsePublicTierListsResult {
    tierLists: TierListSummaryPublic[];
    total: number;
    page: number;
    totalPages: number;
}

export function browsePublicTierLists(options: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: PublicTierListSort;
}): BrowsePublicTierListsResult {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 50);
    const offset = (page - 1) * limit;

    const result = getPublicTierLists({
        limit,
        offset,
        search: options.search,
        sort: options.sort,
    });

    const tierLists = result.rows.map(toPublicSummary);
    const totalPages = Math.ceil(result.total / limit);

    return {
        tierLists,
        total: result.total,
        page,
        totalPages,
    };
}
