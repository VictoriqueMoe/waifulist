import { AnimePicture } from "@/types/anime";

export interface CharacterImage {
    jpg: {
        image_url: string;
    };
    webp?: {
        image_url: string;
        small_image_url: string;
    };
}

export interface CharacterAnimeEntry {
    mal_id: number;
    url: string;
    images: AnimePicture;
    title: string;
}

export interface CharacterMangaEntry {
    mal_id: number;
    url: string;
    images: AnimePicture;
    title: string;
}

export interface CharacterAnimeAppearance {
    role: "Main" | "Supporting";
    anime: CharacterAnimeEntry;
}

export interface CharacterMangaAppearance {
    role: "Main" | "Supporting";
    manga: CharacterMangaEntry;
}

export interface CharacterVoiceActor {
    person: {
        mal_id: number;
        url: string;
        images: {
            jpg: {
                image_url: string;
            };
        };
        name: string;
    };
    language: string;
}

export interface CharacterFull {
    mal_id: number;
    url: string;
    images: CharacterImage;
    name: string;
    name_kanji?: string;
    nicknames: string[];
    favorites: number;
    about?: string;
    anime: CharacterAnimeAppearance[];
    manga: CharacterMangaAppearance[];
    voices: CharacterVoiceActor[];
}

export interface CharacterFullResponse {
    data: CharacterFull;
}
