import { describe, expect, it } from "vitest";
import { ErrorDeConfiguracion } from "@/backend/lib/erroresLib";
import { envDolar, envFirma, envOpenAI, envSupabase } from "@/backend/lib/env";
import { conVariables } from "@/backend/tests/helpers/variablesDeEntorno";

// Las variables de entorno de cada servicio, validadas al usarlas. Sin mocks: cambia process.env de verdad solo durante
// cada caso (conVariables). Lo de OpenAI que crea el modelo está en openai.test.ts.

const CLAVE_32 = "c".repeat(32);

describe("envFirma — la clave con la que se firman las respuestas", () => {
  it("con 32 caracteres (el mínimo) se acepta", () => {
    expect(conVariables({ FIRMA_DE_MENSAJES: CLAVE_32 }, () => envFirma())).toEqual({ clave: CLAVE_32 });
  });

  it("con 31 caracteres no: error de configuración que dice el mínimo", () => {
    conVariables({ FIRMA_DE_MENSAJES: "c".repeat(31) }, () => {
      expect(() => envFirma()).toThrow(ErrorDeConfiguracion);
      expect(() => envFirma()).toThrow(/al menos 32/);
    });
  });

  it.each([
    ["sin la variable", undefined],
    ["vacía", ""],
  ])("%s: error de configuración que dice qué falta", (_caso, valor) => {
    conVariables({ FIRMA_DE_MENSAJES: valor }, () => {
      expect(() => envFirma()).toThrow(ErrorDeConfiguracion);
      expect(() => envFirma()).toThrow(/FIRMA_DE_MENSAJES/);
    });
  });
});

describe("envSupabase", () => {
  it("con URL y clave válidas, las devuelve", () => {
    const supabase = conVariables(
      { SUPABASE_URL: "https://proyecto.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_prueba" },
      () => envSupabase()
    );

    expect(supabase).toEqual({ url: "https://proyecto.supabase.co", key: "sb_publishable_prueba" });
  });

  it("una URL que no es URL es un error de configuración", () => {
    conVariables({ SUPABASE_URL: "no-es-una-url", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_prueba" }, () => {
      expect(() => envSupabase()).toThrow(ErrorDeConfiguracion);
      expect(() => envSupabase()).toThrow(/SUPABASE_URL/);
    });
  });

  it("sin la clave pública, error de configuración que dice cuál falta", () => {
    conVariables({ SUPABASE_URL: "https://proyecto.supabase.co", SUPABASE_PUBLISHABLE_KEY: undefined }, () => {
      expect(() => envSupabase()).toThrow(ErrorDeConfiguracion);
      expect(() => envSupabase()).toThrow(/SUPABASE_PUBLISHABLE_KEY/);
    });
  });
});

describe("envDolar — la dirección de dolarapi.com", () => {
  it.each([
    ["sin la variable", undefined],
    ["vacía (como en .env.example)", ""],
  ])("%s: usa la de dolarapi.com", (_caso, valor) => {
    expect(conVariables({ DOLARAPI_URL: valor }, () => envDolar())).toEqual({
      endpoint: "https://dolarapi.com/v1/dolares",
    });
  });

  it("con una dirección propia (los E2E usan un servidor falso), usa esa", () => {
    expect(conVariables({ DOLARAPI_URL: "http://127.0.0.1:3102/v1/dolares" }, () => envDolar())).toEqual({
      endpoint: "http://127.0.0.1:3102/v1/dolares",
    });
  });

  it("una dirección que no es URL es un error de configuración", () => {
    conVariables({ DOLARAPI_URL: "no-es-una-url" }, () => {
      expect(() => envDolar()).toThrow(ErrorDeConfiguracion);
    });
  });
});

describe("envOpenAI — valores por defecto", () => {
  it("sin URL ni modelo (o vacíos), usa la API de OpenAI y gpt-4.1", () => {
    const openai = conVariables({ OPENAI_API_KEY: "sk-prueba", OPENAI_BASE_URL: "", OPENAI_MODEL: undefined }, () =>
      envOpenAI()
    );

    expect(openai).toEqual({ apiKey: "sk-prueba", baseURL: "https://api.openai.com/v1", modelo: "gpt-4.1" });
  });
});
