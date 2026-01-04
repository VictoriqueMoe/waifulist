import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfilePageClient } from "./ProfilePageClient";

export const metadata: Metadata = {
    title: "My Profile | WaifuList",
    description: "View your anime watching statistics and profile",
};

export default async function ProfilePage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    return <ProfilePageClient />;
}
