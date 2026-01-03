import { TracePageClient } from "./TracePageClient";

export const metadata = {
    title: "Anime Scene Search - WaifuList",
    description: "Upload an anime screenshot to identify the anime, episode, and timestamp",
};

export default function TracePage() {
    return <TracePageClient />;
}
