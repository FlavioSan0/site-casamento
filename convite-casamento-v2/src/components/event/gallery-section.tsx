"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type GalleryImage = {
  id: number;
  imagem_url: string;
  destaque?: boolean | null;
  ordem?: number | null;
};

type GallerySectionProps = {
  imagens: GalleryImage[];
};

export function GallerySection({ imagens }: GallerySectionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const ordered = useMemo(
    () =>
      [...imagens]
        .sort(
          (a, b) =>
            Number(Boolean(b.destaque)) - Number(Boolean(a.destaque)) ||
            (a.ordem ?? 9999) - (b.ordem ?? 9999),
        )
        .slice(0, 5),
    [imagens],
  );

  const close = useCallback(() => {
    setActiveIndex(null);
    if (focusFrameRef.current !== null) {
      window.cancelAnimationFrame(focusFrameRef.current);
    }
    focusFrameRef.current = window.requestAnimationFrame(() => {
      triggerRef.current?.focus();
      focusFrameRef.current = null;
    });
  }, []);

  useEffect(
    () => () => {
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
      }
    },
    [],
  );

  const move = useCallback(
    (direction: number) => {
      setActiveIndex((current) =>
        current === null ? 0 : (current + direction + ordered.length) % ordered.length,
      );
    },
    [ordered.length],
  );

  const lightboxOpen = activeIndex !== null;

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "Tab") {
        const controls = document.querySelectorAll<HTMLElement>(".gallery-lightbox button");
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen, close, move]);

  if (!ordered.length) return null;

  return (
    <>
      <section className="event-section gallery-section">
        <div className="section-header">
          <span className="section-badge">Galeria</span>
          <h2 className="section-title">Momentos do nosso ensaio</h2>
          <p className="section-description">
            Registros especiais do nosso pré-wedding e da preparação para esse grande dia.
          </p>
        </div>

        <div className={`gallery-grid-refined${ordered.length === 1 ? " gallery-grid-refined--single" : ""}`}>
          {ordered.map((imagem, index) => (
            <button
              key={imagem.id}
              type="button"
              className={`gallery-card${index === 0 ? " gallery-card--featured" : ""}`}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setActiveIndex(index);
              }}
              aria-label={`Ampliar foto ${index + 1} de ${ordered.length}`}
            >
              <Image
                src={imagem.imagem_url}
                alt={`Foto ${index + 1} do casal`}
                fill
                sizes={index === 0 ? "(max-width: 900px) 100vw, 58vw" : "(max-width: 640px) 50vw, 22vw"}
                className="gallery-card__image"
              />
            </button>
          ))}
        </div>
      </section>

      {activeIndex !== null ? (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${activeIndex + 1} de ${ordered.length}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <button ref={closeButtonRef} type="button" className="gallery-lightbox__close" onClick={close} aria-label="Fechar galeria">
            ×
          </button>
          {ordered.length > 1 ? (
            <button type="button" className="gallery-lightbox__nav gallery-lightbox__nav--previous" onClick={() => move(-1)} aria-label="Foto anterior">
              ‹
            </button>
          ) : null}
          <div className="gallery-lightbox__media">
            <Image src={ordered[activeIndex].imagem_url} alt={`Foto ampliada ${activeIndex + 1} do casal`} fill sizes="100vw" className="gallery-lightbox__image" />
          </div>
          {ordered.length > 1 ? (
            <button type="button" className="gallery-lightbox__nav gallery-lightbox__nav--next" onClick={() => move(1)} aria-label="Próxima foto">
              ›
            </button>
          ) : null}
          <p className="gallery-lightbox__counter" aria-live="polite">
            {activeIndex + 1} / {ordered.length}
          </p>
        </div>
      ) : null}
    </>
  );
}
