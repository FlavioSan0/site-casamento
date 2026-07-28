"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type PixSectionProps = {
  chavePix: string | null;
  qrPixUrl: string | null;
};

export function PixSection({ chavePix, qrPixUrl }: PixSectionProps) {
  const [feedback, setFeedback] = useState("");
  const feedbackTimerRef = useRef<number | null>(null);
  const copied = feedback.startsWith("Chave PIX copiada");

  useEffect(
    () => () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    },
    [],
  );

  function clearFeedbackLater() {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback("");
      feedbackTimerRef.current = null;
    }, 2500);
  }

  if (!chavePix && !qrPixUrl) {
    return null;
  }

  async function handleCopyPix() {
    if (!chavePix) return;

    try {
      await navigator.clipboard.writeText(chavePix);
      setFeedback("Chave PIX copiada com sucesso.");
      clearFeedbackLater();
    } catch {
      setFeedback("Não foi possível copiar a chave PIX.");
      clearFeedbackLater();
    }
  }

  return (
    <section className="event-section pix-section-refined">
      <div className="pix-section-refined__header">
        <div className="pix-section-refined__copy">
          <span className="section-badge">Presente via PIX</span>
          <h2 className="section-title">Nos abençoe com uma contribuição</h2>
          <p className="section-description">
            Caso prefira, você também pode nos presentear via PIX. Toda
            contribuição será recebida com muito carinho e gratidão.
          </p>
        </div>
      </div>

      <div className="pix-grid-refined">
        <div className="pix-content-refined">
          {chavePix ? (
            <div className="pix-box-refined">
              <span className="pix-box-refined__label">Chave PIX</span>

              <div className="pix-box-refined__key-wrap">
                <div className="pix-box-refined__key">{chavePix}</div>

                <button
                  type="button"
                  className="event-button pix-copy-button-refined"
                  onClick={handleCopyPix}
                  aria-describedby={feedback ? "pix-copy-feedback" : undefined}
                  data-copied={copied ? "true" : undefined}
                >
                  {copied ? "Copiado" : "Copiar chave PIX"}
                </button>
              </div>

              {feedback ? (
                <p id="pix-copy-feedback" className="pix-feedback-refined" role="status" aria-live="polite">
                  {feedback}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {qrPixUrl ? (
          <div className="pix-qr-card-refined">
            <div className="pix-qr-card-refined__inner">
              <Image
                src={qrPixUrl}
                alt="QR Code PIX"
                width={680}
                height={680}
                sizes="(max-width: 640px) calc(100vw - 68px), 340px"
                className="pix-qr-card-refined__image"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="section-note-inline">
        <strong>Com gratidão</strong>
        <p>
          Sua contribuição é uma forma especial de participar desse momento tão
          importante da nossa história.
        </p>
      </div>
    </section>
  );
}
