export interface User {
    id: number;
    username: string;
    publicId: string;
}

export interface AuthResponse {
    user?: User;
    error?: string;
}

export async function fetchCurrentUser(): Promise<User | null> {
    try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        return data.user || null;
    } catch {
        return null;
    }
}

export async function loginUser(username: string, password: string, turnstileToken: string): Promise<AuthResponse> {
    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, turnstileToken }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error || "Login failed" };
        }

        return { user: data.user };
    } catch {
        return { error: "Login failed" };
    }
}

export async function registerUser(username: string, password: string, turnstileToken: string): Promise<AuthResponse> {
    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, turnstileToken }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error || "Registration failed" };
        }

        return { user: data.user };
    } catch {
        return { error: "Registration failed" };
    }
}

export async function logoutUser(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
}

export async function updateUserUsername(newUsername: string, password: string): Promise<AuthResponse> {
    try {
        const response = await fetch("/api/auth/username", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: newUsername, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { error: data.error || "Failed to update username" };
        }

        return { user: data.user };
    } catch {
        return { error: "Failed to update username" };
    }
}
