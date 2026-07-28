"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  EVENT_OPENING_FALLBACK_MS,
  nextOpeningPhase,
  type OpeningPhase,
  shouldPlayEventOpening,
} from "../../lib/utils/event-motion";

type EventOpeningProps = {
  eventKey: string;
  coupleNames: string;
  eventDate: string;
  children: React.ReactNode;
  preview?: boolean;
  onComplete?: () => void;
};

const EventMotionReadyContext = createContext(true);

export function useEventMotionReady() {
  return useContext(EventMotionReadyContext);
}

export function EventOpening({
  eventKey,
  coupleNames,
  eventDate,
  children,
  preview = false,
  onComplete,
}: EventOpeningProps) {
  const [phase, setPhase] = useState<OpeningPhase>("checking");
  const [heroEntry, setHeroEntry] = useState<
    "after-opening" | "returning" | "none"
  >("none");
  const skipRef = useRef<HTMLButtonElement>(null);
  const completeRef = useRef(false);
  const fallbackRef = useRef<number | null>(null);
  const scrollRef = useRef<{ html: string; body: string } | null>(null);
  const storageKey = `wedding-opening-seen:${eventKey}`;

  const unlockScroll = useCallback(() => {
    document.documentElement.classList.remove("event-opening-active");
    if (!scrollRef.current) return;
    document.documentElement.style.overflow = scrollRef.current.html;
    document.body.style.overflow = scrollRef.current.body;
    scrollRef.current = null;
  }, []);

  const complete = useCallback(
    (heroEntry: "after-opening" | "returning" | "none") => {
      if (completeRef.current) return;
      completeRef.current = true;
      if (!preview) {
        try {
          sessionStorage.setItem(storageKey, "seen");
        } catch {}
      }

      if (fallbackRef.current !== null) {
        window.clearTimeout(fallbackRef.current);
        fallbackRef.current = null;
      }
      unlockScroll();
      setHeroEntry(heroEntry);
      setPhase("complete");
      onComplete?.();
    },
    [onComplete, preview, storageKey, unlockScroll],
  );

  useEffect(() => {
    if (preview) {
      const startFrame = window.requestAnimationFrame(() => {
        setPhase("entering");
      });
      fallbackRef.current = window.setTimeout(
        () => complete("none"),
        EVENT_OPENING_FALLBACK_MS,
      );
      return () => {
        window.cancelAnimationFrame(startFrame);
        if (fallbackRef.current !== null) {
          window.clearTimeout(fallbackRef.current);
          fallbackRef.current = null;
        }
      };
    }

    let seen = false;
    try {
      seen = sessionStorage.getItem(storageKey) === "seen";
    } catch {}

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!shouldPlayEventOpening(seen, reducedMotion)) {
      const timeout = window.setTimeout(
        () => complete(reducedMotion ? "none" : "returning"),
        0,
      );
      return () => window.clearTimeout(timeout);
    }

    scrollRef.current = {
      html: document.documentElement.style.overflow,
      body: document.body.style.overflow,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("event-opening-active");
    const startFrame = window.requestAnimationFrame(() => {
      setPhase("entering");
      skipRef.current?.focus({ preventScroll: true });
    });
    fallbackRef.current = window.setTimeout(
      () => complete("after-opening"),
      EVENT_OPENING_FALLBACK_MS,
    );

    return () => {
      window.cancelAnimationFrame(startFrame);
      if (fallbackRef.current !== null) {
        window.clearTimeout(fallbackRef.current);
        fallbackRef.current = null;
      }
      unlockScroll();
    };
  }, [complete, preview, storageKey, unlockScroll]);

  function advance() {
    if (phase === "checking" || phase === "complete") return;
    if (phase === "closing") {
      complete("after-opening");
      return;
    }
    setPhase(nextOpeningPhase(phase));
  }

  function handleAnimationEnd(event: React.AnimationEvent<HTMLElement>) {
    const transitions: Partial<Record<string, OpeningPhase>> = {
      "wedding-envelope-enter": "entering",
      "wedding-envelope-flap-open": "opening",
      "wedding-card-rise": "revealing",
    };
    const expectedPhase = transitions[event.animationName];

    if (expectedPhase === phase) {
      setPhase(nextOpeningPhase(phase));
    } else if (
      event.animationName === "wedding-opening-dismiss" &&
      phase === "closing"
    ) {
      complete("after-opening");
    }
  }

  const sessionCheckScript = `try{if(sessionStorage.getItem(${JSON.stringify(storageKey).replaceAll("<", "\\u003c")})==="seen")document.currentScript?.previousElementSibling?.setAttribute("hidden","")}catch{}`;
  const opening = phase !== "complete";

  return (
    <EventMotionReadyContext.Provider value={!opening}>
      <div
        className="event-motion"
        data-opening-phase={phase}
        data-hero-entry={phase === "complete" ? heroEntry : "none"}
      >
        {opening ? (
          <>
            <div
              suppressHydrationWarning
              className={`event-opening${preview ? " event-opening--preview" : ""}`}
              role={preview ? "region" : "dialog"}
              aria-modal={preview ? undefined : "true"}
              aria-labelledby="event-opening-title"
              data-opening-phase={phase}
              onAnimationEnd={handleAnimationEnd}
              onKeyDown={(event) => {
                if (event.key === "Escape") complete("after-opening");
                if (!preview && event.key === "Tab") {
                  event.preventDefault();
                  skipRef.current?.focus();
                }
              }}
            >
              <div className="wedding-envelope-stage">
                <button
                  type="button"
                  className="wedding-envelope-scene"
                  onClick={advance}
                  aria-label="Avançar abertura do convite"
                >
                  <span className="wedding-envelope">
                    <span className="wedding-envelope__back" />
                    <span className="wedding-invitation-card">
                      <span className="wedding-invitation-card__content">
                        <span className="wedding-invitation-card__eyebrow">
                          Convite de casamento
                        </span>
                        <span
                          id="event-opening-title"
                          className="wedding-invitation-card__names"
                        >
                          {coupleNames || "Flávio & Ana"}
                        </span>
                        <span className="wedding-invitation-card__date">
                          {eventDate || "15 de agosto de 2026"}
                        </span>
                      </span>
                    </span>
                    <span className="wedding-envelope__fold wedding-envelope__fold--left" />
                    <span className="wedding-envelope__fold wedding-envelope__fold--right" />
                    <span className="wedding-envelope__fold wedding-envelope__fold--bottom" />
                    <span className="wedding-envelope__flap" />
                  </span>
                </button>

                <button
                  ref={skipRef}
                  type="button"
                  className="event-opening__skip"
                  onClick={() => complete("after-opening")}
                >
                  Pular abertura
                </button>
              </div>
            </div>
            {!preview ? (
              <script dangerouslySetInnerHTML={{ __html: sessionCheckScript }} />
            ) : null}
          </>
        ) : null}

        {children}
      </div>
    </EventMotionReadyContext.Provider>
  );
}
