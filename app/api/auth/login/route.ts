import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername, verifyPassword } from "@/lib/db";
import { setSessionCookie, signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password required" }, { status: 400 });
        }

        const user = getUserByUsername(username);
        if (!user) {
            return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
        }

        const validPassword = await verifyPassword(password, user.password_hash);
        if (!validPassword) {
            return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
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
        console.error("Login error:", error);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
