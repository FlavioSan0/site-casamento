export type NameMatchConfirmation = {
  id: number;
  nome: string;
  nomes_acompanhantes?: string[] | null;
};

export type NameMatchKind = "exact" | "partial" | "single-token";

export type NameMatchResult<T extends NameMatchConfirmation> = {
  confirmation: T;
  kind: NameMatchKind;
  score: number;
  matchedName: string;
};

const NAME_PARTICLES = new Set([
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
]);

export function normalizePersonName(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function meaningfulNameTokens(value: unknown) {
  return normalizePersonName(value)
    .split(" ")
    .filter((token) => token.length >= 2 && !NAME_PARTICLES.has(token));
}

export function confirmationNameValues(
  confirmation: NameMatchConfirmation,
): string[] {
  return [
    confirmation.nome,
    ...(Array.isArray(confirmation.nomes_acompanhantes)
      ? confirmation.nomes_acompanhantes
      : []),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export function confirmationNameKeys(
  confirmation: NameMatchConfirmation,
): string[] {
  return Array.from(
    new Set(
      confirmationNameValues(confirmation)
        .map(normalizePersonName)
        .filter((value) => value.length >= 3),
    ),
  );
}

function isSubset(subset: readonly string[], superset: readonly string[]) {
  return subset.every((token) => superset.includes(token));
}

function scoreNamePair(
  reservationName: unknown,
  candidateName: unknown,
): { kind: NameMatchKind; score: number } | null {
  const reservationNormalized = normalizePersonName(reservationName);
  const candidateNormalized = normalizePersonName(candidateName);

  if (!reservationNormalized || !candidateNormalized) return null;

  if (reservationNormalized === candidateNormalized) {
    return { kind: "exact", score: 100 };
  }

  const reservationTokens = meaningfulNameTokens(reservationNormalized);
  const candidateTokens = meaningfulNameTokens(candidateNormalized);

  if (!reservationTokens.length || !candidateTokens.length) return null;

  if (
    reservationTokens.length >= 2 &&
    isSubset(reservationTokens, candidateTokens)
  ) {
    return { kind: "partial", score: 92 };
  }

  if (
    candidateTokens.length >= 2 &&
    isSubset(candidateTokens, reservationTokens)
  ) {
    return { kind: "partial", score: 88 };
  }

  if (
    reservationTokens.length === 1 &&
    reservationTokens[0].length >= 4 &&
    candidateTokens.includes(reservationTokens[0])
  ) {
    return { kind: "single-token", score: 72 };
  }

  return null;
}

export function findUniqueConfirmationMatchByName<
  T extends NameMatchConfirmation,
>(
  reservationName: unknown,
  confirmations: readonly T[],
): NameMatchResult<T> | null {
  const normalized = normalizePersonName(reservationName);
  if (normalized.length < 3) return null;

  const bestByConfirmation = new Map<number, NameMatchResult<T>>();

  confirmations.forEach((confirmation) => {
    confirmationNameValues(confirmation).forEach((candidateName) => {
      const match = scoreNamePair(reservationName, candidateName);
      if (!match) return;

      const current = bestByConfirmation.get(confirmation.id);
      if (!current || match.score > current.score) {
        bestByConfirmation.set(confirmation.id, {
          confirmation,
          kind: match.kind,
          score: match.score,
          matchedName: candidateName,
        });
      }
    });
  });

  const ranked = Array.from(bestByConfirmation.values()).sort(
    (a, b) => b.score - a.score,
  );

  if (!ranked.length) return null;
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) return null;

  return ranked[0];
}

export function findUniqueConfirmationByName<T extends NameMatchConfirmation>(
  reservationName: unknown,
  confirmations: readonly T[],
): T | null {
  return (
    findUniqueConfirmationMatchByName(reservationName, confirmations)
      ?.confirmation || null
  );
}
