"use client";

import { useEffect, useRef } from "react";
import { useEventMotionReady } from "./event-opening";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "section" | "children";
};

const revealElements = new Set<HTMLElement>();
let revealObserver: IntersectionObserver | null = null;

function stopObserving(element: HTMLElement) {
  revealObserver?.unobserve(element);
  revealElements.delete(element);
  if (revealElements.size === 0) {
    revealObserver?.disconnect();
    revealObserver = null;
  }
}

function observeReveal(element: HTMLElement) {
  revealElements.add(element);
  revealObserver ??= new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target as HTMLElement;
        target.dataset.revealVisible = "true";
        stopObserving(target);
      });
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
  );
  revealObserver.observe(element);
  return () => stopObserving(element);
}

export function Reveal({
  children,
  className = "",
  variant = "section",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const motionReady = useEventMotionReady();

  useEffect(() => {
    if (!motionReady) return;

    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.dataset.revealVisible = "true";
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.94) {
      element.dataset.revealVisible = "true";
      return;
    }

    element.dataset.revealReady = "true";
    return observeReveal(element);
  }, [motionReady]);

  return (
    <div
      ref={ref}
      data-reveal-variant={variant}
      className={`reveal${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
