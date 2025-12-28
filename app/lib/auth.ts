import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getUserById, User } from "./db";

const JWT_SECRET = process.env.JWT_SECRET ?? "waifulist-super-secret-key-change-in-production";
const COOKIE_NAME = "waifulist_session";
const TOKEN_EXPIRY = "7d";

export interface JWTPayload {
    userId: number;
    username: string;
    iat?: number;
    exp?: number;
}

export function signToken(user: User): string {
    const payload: JWTPayload = {
        userId: user.id,
        username: user.username,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

export async function setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    });
}

export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | null> {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    return cookie?.value || null;
}

export async function getCurrentUser(): Promise<User | null> {
    const token = await getSessionToken();
    if (!token) {
        return null;
    }

    const payload = verifyToken(token);
    if (!payload) {
        return null;
    }

    return getUserById(payload.userId);
}

export async function requireAuth(): Promise<User> {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    return user;
}
