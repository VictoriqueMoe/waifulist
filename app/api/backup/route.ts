import { getCurrentUser } from "@/lib/auth";
import { getAllWatched } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(): Promise<Response> {
    const user = await getCurrentUser();
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorised" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
    try {
        return NextResponse.json(getAllWatched(user.id));
    } catch (error) {
        console.error("Export error:", error);
        return new Response(JSON.stringify({ error: "Failed to export file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
