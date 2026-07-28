export class PatchValidationError extends Error {}

type PatchEnvelope = {
  eventoId: number;
  expectedUpdatedAt?: string;
  fields: Record<string, unknown>;
};

export function parsePatchEnvelope(
  input: unknown,
  allowedFields: readonly string[],
): PatchEnvelope {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PatchValidationError("Payload invÃ¡lido.");
  }

  const body = input as Record<string, unknown>;
  const allowed = new Set(["evento_id", "expected_updated_at", ...allowedFields]);
  const unknownFields = Object.keys(body).filter((key) => !allowed.has(key));

  if (unknownFields.length) {
    throw new PatchValidationError(
      `Campo nÃ£o permitido: ${unknownFields.join(", ")}.`,
    );
  }

  const eventoId = Number(body.evento_id);
  if (!Number.isInteger(eventoId) || eventoId <= 0) {
    throw new PatchValidationError("Evento invÃ¡lido.");
  }

  const expectedUpdatedAt =
    typeof body.expected_updated_at === "string" &&
    body.expected_updated_at.trim()
      ? body.expected_updated_at.trim()
      : undefined;

  const fields = Object.fromEntries(
    allowedFields
      .filter(
        (field) =>
          Object.prototype.hasOwnProperty.call(body, field) &&
          body[field] !== undefined,
      )
      .map((field) => [field, body[field]]),
  );

  if (!Object.keys(fields).length) {
    throw new PatchValidationError("Nenhuma alteraÃ§Ã£o foi enviada.");
  }

  return { eventoId, expectedUpdatedAt, fields };
}

export function buildChangedPatch<T extends object>(
  saved: T,
  current: T,
  fields: readonly (keyof T)[],
) {
  return Object.fromEntries(
    fields
      .filter((field) => saved[field] !== current[field])
      .map((field) => [field, current[field]]),
  ) as Partial<T>;
}

export function nullableText(value: unknown, field: string) {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new PatchValidationError(`${field} deve ser texto.`);
  }
  return value.trim() || null;
}

export function requiredText(value: unknown, field: string) {
  const normalized = nullableText(value, field);
  if (!normalized) {
    throw new PatchValidationError(`${field} Ã© obrigatÃ³rio.`);
  }
  return normalized;
}

export function hexColor(value: unknown, field: string) {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    throw new PatchValidationError(`${field} deve usar o formato #RRGGBB.`);
  }
  return value.trim().toUpperCase();
}

export function boundedInteger(
  value: unknown,
  field: string,
  min: number,
  max: number,
) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new PatchValidationError(
      `${field} deve ser um nÃºmero entre ${min} e ${max}.`,
    );
  }
  return number;
}

export function enumValue<const T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new PatchValidationError(`${field} possui um valor invÃ¡lido.`);
  }
  return value as T;
}

export function booleanValue(value: unknown, field: string) {
  if (typeof value !== "boolean") {
    throw new PatchValidationError(`${field} deve ser verdadeiro ou falso.`);
  }
  return value;
}

export function safeMediaUrl(value: unknown, field: string) {
  const normalized = nullableText(value, field);
  if (!normalized || normalized.startsWith("/")) return normalized;

  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    throw new PatchValidationError(`${field} deve ser uma URL HTTP(S) segura.`);
  }

  return normalized;
}
