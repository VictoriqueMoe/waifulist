import { TierListComment, TierListData, TierListWithCharacters } from "@/types/tierlist";

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

export interface PublicTierListsResponse {
    tierLists: TierListSummaryPublic[];
    total: number;
    page: number;
    totalPages: number;
}

export async function fetchUserTierLists(): Promise<TierListSummary[]> {
    const response = await fetch("/api/tierlist");
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load tier lists");
    }
    const data = await response.json();
    return data.tierLists;
}

export async function fetchTierList(publicId: string): Promise<TierListWithCharacters> {
    const response = await fetch(`/api/tierlist/${publicId}`);
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Tier list not found");
        }
        const data = await response.json();
        throw new Error(data.error || "Failed to load tier list");
    }
    const data = await response.json();
    return data.tierList;
}

export async function createTierListApi(name: string = "My Tier List"): Promise<TierListSummary> {
    const response = await fetch("/api/tierlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create tier list");
    }
    const data = await response.json();
    return data.tierList;
}

export async function updateTierListApi(
    publicId: string,
    updates: { name?: string; data?: TierListData },
): Promise<void> {
    const response = await fetch(`/api/tierlist/${publicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save tier list");
    }
}

export async function deleteTierListApi(publicId: string): Promise<void> {
    const response = await fetch(`/api/tierlist/${publicId}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete tier list");
    }
}

export async function updateTierListVisibility(publicId: string, isPublic: boolean): Promise<void> {
    const response = await fetch(`/api/tierlist/${publicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update visibility");
    }
}

export async function createAnonymousTierListApi(
    name: string,
    data: TierListData,
): Promise<{ publicId: string; name: string }> {
    const response = await fetch("/api/tierlist/anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, data }),
    });
    if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create tier list");
    }
    return response.json();
}

export async function fetchPublicTierLists(options: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: "newest" | "oldest" | "name";
}): Promise<PublicTierListsResponse> {
    const params = new URLSearchParams();
    if (options.page) {
        params.set("page", String(options.page));
    }
    if (options.limit) {
        params.set("limit", String(options.limit));
    }
    if (options.search) {
        params.set("q", options.search);
    }
    if (options.sort) {
        params.set("sort", options.sort);
    }

    const response = await fetch(`/api/tierlist/public?${params.toString()}`);
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch public tier lists");
    }
    return response.json();
}

export interface CommentsResponse {
    comments: TierListComment[];
    commentsEnabled: boolean;
}

export async function fetchComments(publicId: string): Promise<CommentsResponse> {
    const response = await fetch(`/api/tierlist/${publicId}/comments`);
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch comments");
    }
    return response.json();
}

export async function postComment(publicId: string, content: string, turnstileToken: string): Promise<TierListComment> {
    const response = await fetch(`/api/tierlist/${publicId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, turnstileToken }),
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to post comment");
    }
    const data = await response.json();
    return data.comment;
}

export async function deleteCommentApi(publicId: string, commentId: number): Promise<void> {
    const response = await fetch(`/api/tierlist/${publicId}/comments/${commentId}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete comment");
    }
}

export async function updateCommentsEnabled(publicId: string, enabled: boolean): Promise<void> {
    const response = await fetch(`/api/tierlist/${publicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentsEnabled: enabled }),
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update comments setting");
    }
}

export async function toggleReactionApi(
    publicId: string,
    commentId: number,
    emoji: string,
): Promise<{ added: boolean; emoji: string }> {
    const response = await fetch(`/api/tierlist/${publicId}/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to toggle reaction");
    }
    return response.json();
}
