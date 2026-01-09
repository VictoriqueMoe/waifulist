import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTierListWithCharacters } from "@/services/tierListService";
import { TierListView } from "@/components/TierList";
import { CommentsSection } from "@/components/Comments";
import styles from "./page.module.scss";

interface PageProps {
    params: Promise<{ publicId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { publicId } = await params;
    const tierList = await getTierListWithCharacters(publicId);

    if (!tierList) {
        return { title: "Tier List Not Found | WaifuList" };
    }

    const title = `${tierList.name} by ${tierList.username} | WaifuList`;
    const description = `View ${tierList.username}'s waifu tier list on WaifuList`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
        },
        twitter: {
            card: "summary",
            title,
            description,
        },
    };
}

export default async function TierListPage({ params }: PageProps) {
    const { publicId } = await params;
    const tierList = await getTierListWithCharacters(publicId);

    if (!tierList) {
        notFound();
    }

    const user = await getCurrentUser();
    const isOwner = user !== null && tierList.userId !== null && user.id === tierList.userId;

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <TierListView tierList={tierList} />
                {tierList.userId !== null && <CommentsSection publicId={publicId} isOwner={isOwner} />}
            </div>
        </div>
    );
}
