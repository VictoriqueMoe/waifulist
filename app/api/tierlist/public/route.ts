import { NextRequest, NextResponse } from "next/server";
import { browsePublicTierLists } from "@/services/tierListService";
import { PublicTierListSort } from "@/lib/db";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("q") || undefined;
    const sortParam = searchParams.get("sort");
    const sort = (sortParam === "newest" || sortParam === "oldest" || sortParam === "name")
        ? sortParam as PublicTierListSort
        : "newest";

    const result = browsePublicTierLists({
        page: isNaN(page) ? 1 : page,
        limit: isNaN(limit) ? 20 : limit,
        search,
        sort,
    });

    return NextResponse.json(result);
}
