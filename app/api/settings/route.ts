import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseError, getUserSettings, updateUserSettings } from "@/lib/db";
import type { UserSettings } from "@/types/settings";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const settings = getUserSettings(user.id);
    return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    try {
        const updates: Partial<UserSettings> = await request.json();
        const settings = updateUserSettings(user.id, updates);
        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Update settings error:", error);
        if (error instanceof DatabaseError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
