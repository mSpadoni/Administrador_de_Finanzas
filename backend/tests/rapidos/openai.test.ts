import { describe, expect, it } from "vitest";
import { ErrorDeConfiguracion } from "@/backend/lib/env";
import { crearModeloOpenAI } from "@/backend/lib/openai";
import { conVariables } from "../helpers/variablesDeEntorno";

// Sin mocks: se usa el proveedor real del AI SDK con la configuración de las variables de entorno.

describe("crearModeloOpenAI", () => {
  it("crea un modelo de chat de OpenAI con el modelo configurado", () => {
    const modelo = conVariables({ OPENAI_API_KEY: "sk-prueba", OPENAI_MODEL: "gpt-4o-mini" }, () =>
      crearModeloOpenAI()
    );

    expect(modelo).toMatchObject({ modelId: "gpt-4o-mini", provider: expect.stringMatching(/^openai/) });
  });

  it("se le puede pedir otro modelo puntual", () => {
    const modelo = conVariables({ OPENAI_API_KEY: "sk-prueba" }, () => crearModeloOpenAI("gpt-4o"));

    expect(modelo).toMatchObject({ modelId: "gpt-4o" });
  });

  it("sin OPENAI_API_KEY no se crea: error de configuración que dice qué falta", () => {
    conVariables({ OPENAI_API_KEY: undefined }, () => {
      expect(() => crearModeloOpenAI()).toThrow(ErrorDeConfiguracion);
      expect(() => crearModeloOpenAI()).toThrow(/Falta OPENAI_API_KEY/);
    });
  });
});
