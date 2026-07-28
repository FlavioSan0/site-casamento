"use client";

import { useState } from "react";

type PixSectionProps = {
  chavePix: string | null;
  qrPixUrl: string | null;
};

export function PixSection({ chavePix, qrPixUrl }: PixSectionProps) {
  const [feedback, setFeedback] = useState("");

  if (!chavePix && !qrPixUrl) {
    return null;
  }

  async function handleCopyPix() {
    if (!chavePix) return;

    try {
      await navigator.clipboard.writeText(chavePix);
      setFeedback("Chave PIX copiada com sucesso.");
      window.setTimeout(() => setFeedback(""), 2500);
    } catch {
      setFeedback("Não foi possível copiar a chave PIX.");
      window.setTimeout(() => setFeedback(""), 2500);
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
                >
                  Copiar chave PIX
                </button>
              </div>

              {feedback ? <p className="pix-feedback-refined">{feedback}</p> : null}
            </div>
          ) : null}
        </div>

        {qrPixUrl ? (
          <div className="pix-qr-card-refined">
            <div className="pix-qr-card-refined__inner">
              <img
                src={qrPixUrl}
                alt="QR Code PIX"
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