import { NextResponse } from "next/server";
import { getCurrentUser, setSessionCookie, signToken } from "@/lib/auth";
import { DatabaseError, getUserByUsername, updateUsername, verifyPassword } from "@/lib/db";
import { invalidateOgImageCache } from "@/lib/redis";

export async function PATCH(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    let body: { username?: string; password?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { username, password } = body;

    if (!username) {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    if (!password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length === 0) {
        return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
    }

    if (trimmedUsername === user.username) {
        return NextResponse.json({ error: "New username is the same as current username" }, { status: 400 });
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const existingUser = getUserByUsername(trimmedUsername);
    if (existingUser) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    try {
        const updatedUser = updateUsername(user.id, trimmedUsername);

        const token = signToken(updatedUser);
        await setSessionCookie(token);

        // Invalidate cached OG images for this user's public list
        try {
            await invalidateOgImageCache(updatedUser.public_id);
        } catch {
            // Non-critical, log but don't fail the request
            console.error("Failed to invalidate OG image cache");
        }

        return NextResponse.json({
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                publicId: updatedUser.public_id,
            },
        });
    } catch (error) {
        if (error instanceof DatabaseError) {
            if (error.message.includes("already taken")) {
                return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
            }
        }
        console.error("Failed to update username:", error);
        return NextResponse.json({ error: "Failed to update username" }, { status: 500 });
    }
}
