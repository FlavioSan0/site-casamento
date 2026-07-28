export const EVENT_OPENING_FALLBACK_MS = 2400;

export type OpeningPhase =
  | "checking"
  | "entering"
  | "opening"
  | "revealing"
  | "closing"
  | "complete";

const openingSequence: Record<OpeningPhase, OpeningPhase> = {
  checking: "entering",
  entering: "opening",
  opening: "revealing",
  revealing: "closing",
  closing: "complete",
  complete: "complete",
};

export function nextOpeningPhase(phase: OpeningPhase) {
  return openingSequence[phase];
}

export function shouldPlayEventOpening(
  seenThisSession: boolean,
  reducedMotion: boolean,
) {
  return !seenThisSession && !reducedMotion;
}
