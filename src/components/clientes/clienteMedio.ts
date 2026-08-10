import { z } from "zod";

export const CLIENTE_MEDIO_OPTIONS = [
  "Redes sociales",
  "Google ADS",
  "Orgánica web",
  "Referencia",
  "Otros",
] as const;

export const clienteMedioSchemaFields = {
  medio: z.enum(CLIENTE_MEDIO_OPTIONS).or(z.literal("")).optional().default(""),
  medioOtros: z.string().optional().default(""),
};

export function refineClienteMedio(
  data: { medio?: string; medioOtros?: string } | null | undefined,
  ctx: z.RefinementCtx,
  pathPrefix: string[] = []
) {
  if (data?.medio === "Otros" && !String(data?.medioOtros || "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...pathPrefix, "medioOtros"],
      message: "Especifique el medio cuando selecciona 'Otros'",
    });
  }
}

export function buildClienteMedioPayload(data: { medio?: string; medioOtros?: string } | null | undefined) {
  const medio = String(data?.medio || "").trim();
  const medioOtros = String(data?.medioOtros || "").trim();

  return {
    medio,
    medioOtros: medio === "Otros" ? medioOtros : "",
  };
}

export function normalizeClienteMedioValues(medio: string | undefined, medioOtros: string | undefined) {
  const cleanMedio = String(medio || "").trim();
  const cleanMedioOtros = String(medioOtros || "").trim();

  if (!cleanMedio) {
    return { medio: "", medioOtros: "" };
  }

  if (CLIENTE_MEDIO_OPTIONS.includes(cleanMedio as (typeof CLIENTE_MEDIO_OPTIONS)[number])) {
    return {
      medio: cleanMedio,
      medioOtros: cleanMedio === "Otros" ? cleanMedioOtros : "",
    };
  }

  if (cleanMedio.toLowerCase() === "redes sociales") {
    return { medio: "Redes sociales", medioOtros: "" };
  }

  if (cleanMedio.toLowerCase() === "google") {
    return { medio: "Google ADS", medioOtros: "" };
  }

  if (cleanMedio.toLowerCase() === "organica web") {
    return { medio: "Orgánica web", medioOtros: "" };
  }

  if (cleanMedio.toLowerCase() === "otro") {
    return { medio: "Otros", medioOtros: cleanMedioOtros };
  }

  return {
    medio: "Otros",
    medioOtros: cleanMedioOtros || cleanMedio,
  };
}