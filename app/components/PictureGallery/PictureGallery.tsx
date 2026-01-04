"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimePicture } from "@/types/anime";
import styles from "./PictureGallery.module.scss";

interface PictureGalleryProps {
    pictures: AnimePicture[];
}

export function PictureGallery({ pictures }: PictureGalleryProps) {
    const validPictures = pictures.filter(p => p.jpg?.large_image_url);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    if (validPictures.length === 0) {
        return null;
    }

    const goToPrevious = () => {
        setCurrentIndex(prev => (prev === 0 ? validPictures.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex(prev => (prev === validPictures.length - 1 ? 0 : prev + 1));
    };

    const currentPicture = validPictures[currentIndex];

    return (
        <div className={styles.gallery}>
            <div className={styles.galleryCarousel}>
                <button className={styles.carouselBtn} onClick={goToPrevious} aria-label="Previous image">
                    <i className="bi bi-chevron-left" />
                </button>
                <div className={styles.carouselMain} onClick={() => setIsLightboxOpen(true)}>
                    <Image
                        src={currentPicture.jpg!.large_image_url}
                        alt={`Gallery image ${currentIndex + 1}`}
                        width={450}
                        height={675}
                        unoptimized
                        className={styles.carouselImage}
                    />
                    <span className={styles.carouselCount}>
                        {currentIndex + 1} / {validPictures.length}
                    </span>
                </div>
                <button className={styles.carouselBtn} onClick={goToNext} aria-label="Next image">
                    <i className="bi bi-chevron-right" />
                </button>
            </div>
            <div className={styles.galleryThumbs}>
                {validPictures.map((pic, index) => (
                    <button
                        key={pic.jpg!.image_url}
                        className={`${styles.galleryThumb} ${index === currentIndex ? styles.active : ""}`}
                        onClick={() => setCurrentIndex(index)}
                    >
                        <Image src={pic.jpg!.small_image_url} alt={`Thumbnail ${index + 1}`} fill sizes="70px" />
                    </button>
                ))}
            </div>

            {isLightboxOpen && (
                <div className={styles.lightbox} onClick={() => setIsLightboxOpen(false)}>
                    <button className={styles.lightboxClose} onClick={() => setIsLightboxOpen(false)}>
                        <i className="bi bi-x-lg" />
                    </button>
                    <button
                        className={`${styles.lightboxNav} ${styles.prev}`}
                        onClick={e => {
                            e.stopPropagation();
                            goToPrevious();
                        }}
                    >
                        <i className="bi bi-chevron-left" />
                    </button>
                    <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
                        <Image
                            src={currentPicture.jpg!.large_image_url}
                            alt={`Gallery image ${currentIndex + 1}`}
                            fill
                            sizes="90vw"
                            className={styles.lightboxImage}
                        />
                    </div>
                    <button
                        className={`${styles.lightboxNav} ${styles.next}`}
                        onClick={e => {
                            e.stopPropagation();
                            goToNext();
                        }}
                    >
                        <i className="bi bi-chevron-right" />
                    </button>
                    <span className={styles.lightboxCount}>
                        {currentIndex + 1} / {validPictures.length}
                    </span>
                </div>
            )}
        </div>
    );
}
