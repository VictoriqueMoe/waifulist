export type TierRank = "S" | "A" | "B" | "C" | "D" | "F";

export const TIER_RANKS: TierRank[] = ["S", "A", "B", "C", "D", "F"];

export const TIER_COLORS: Record<TierRank, string> = {
    S: "#ff7f7f",
    A: "#ffbf7f",
    B: "#ffdf7f",
    C: "#ffff7f",
    D: "#bfff7f",
    F: "#7fbfff",
};

export interface CharacterAnime {
    malId: number | null;
    title: string;
}

export interface TierListCharacter {
    anilistId: number;
    name: string;
    image: string;
    anime: CharacterAnime[];
}

export interface TierListData {
    S: number[];
    A: number[];
    B: number[];
    C: number[];
    D: number[];
    F: number[];
}

export interface TierList {
    id: number;
    userId: number;
    publicId: string;
    name: string;
    data: TierListData;
    createdAt: string;
    updatedAt: string;
}

export interface TierListWithCharacters {
    id: number;
    publicId: string;
    name: string;
    userId: number | null;
    username: string;
    tiers: Record<TierRank, TierListCharacter[]>;
    createdAt: string;
    updatedAt: string;
}

export interface CommentReaction {
    emoji: string;
    count: number;
    userReacted: boolean;
    users: string[];
}

export interface TierListComment {
    id: number;
    tierListId: number;
    userId: number;
    username: string;
    content: string;
    createdAt: string;
    reactions: CommentReaction[];
}

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "💩"] as const;
