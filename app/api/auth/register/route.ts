import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByUsername } from "@/lib/db";
import { setSessionCookie, signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password required" }, { status: 400 });
        }

        const existing = getUserByUsername(username);
        if (existing) {
            return NextResponse.json({ error: "Username already taken" }, { status: 409 });
        }

        const user = await createUser(username, password);
        if (!user) {
            return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
        }

        const token = signToken(user);
        await setSessionCookie(token);

        return NextResponse.json({
            user: {
                id: user.id,
                username: user.username,
            },
        });
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json({ error: "Registration failed" }, { status: 500 });
    }
}
