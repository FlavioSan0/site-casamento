"use client";

import { useEffect, useMemo, useState } from "react";

type CountdownProps = {
  dataEvento: string | null;
  horarioEvento: string | null;
};

type CountdownState = {
  dias: string;
  horas: string;
  minutos: string;
  segundos: string;
  encerrado: boolean;
};

function normalizeTime(value: string | null) {
  if (!value) return "17:30";

  const normalized = value.trim().toLowerCase().replace("h", ":");
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : "17:30";
}

function getCountdown(targetDate: Date): CountdownState {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (Number.isNaN(targetDate.getTime()) || diff <= 0) {
    return {
      dias: "00",
      horas: "00",
      minutos: "00",
      segundos: "00",
      encerrado: true,
    };
  }

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutos = Math.floor((diff / (1000 * 60)) % 60);
  const segundos = Math.floor((diff / 1000) % 60);

  return {
    dias: String(dias).padStart(2, "0"),
    horas: String(horas).padStart(2, "0"),
    minutos: String(minutos).padStart(2, "0"),
    segundos: String(segundos).padStart(2, "0"),
    encerrado: false,
  };
}

const initialCountdown: CountdownState = {
  dias: "00",
  horas: "00",
  minutos: "00",
  segundos: "00",
  encerrado: false,
};

export function Countdown({ dataEvento, horarioEvento }: CountdownProps) {
  const targetDate = useMemo(() => {
    const date = dataEvento || "2026-08-15";
    const time = normalizeTime(horarioEvento);
    return new Date(`${date}T${time}:00`);
  }, [dataEvento, horarioEvento]);

  const [countdown, setCountdown] = useState<CountdownState>(initialCountdown);

  useEffect(() => {
    const updateCountdown = () => setCountdown(getCountdown(targetDate));
    const timeout = setTimeout(updateCountdown, 0);

    const interval = setInterval(updateCountdown, 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [targetDate]);

  return (
    <div className="countdown-card">
      <p className="countdown-label">Contagem regressiva</p>

      {countdown.encerrado ? (
        <p className="countdown-ended" role="status">
          O grande dia chegou — obrigado por celebrar conosco.
        </p>
      ) : (
      <div className="countdown-grid" aria-live="off">
        <div className="countdown-item">
          <strong>{countdown.dias}</strong>
          <span>Dias</span>
        </div>

        <div className="countdown-item">
          <strong>{countdown.horas}</strong>
          <span>Horas</span>
        </div>

        <div className="countdown-item">
          <strong>{countdown.minutos}</strong>
          <span>Min</span>
        </div>

        <div className="countdown-item">
          <strong>{countdown.segundos}</strong>
          <span>Seg</span>
        </div>
      </div>
      )}
    </div>
  );
}
