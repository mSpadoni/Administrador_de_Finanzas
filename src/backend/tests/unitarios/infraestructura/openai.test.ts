import { describe, expect, it } from "vitest";
import { ErrorDeConfiguracion } from "@/backend/lib/erroresLib";
import { crearModeloOpenAI, modeloDeOpenAI } from "@/backend/lib/openai";
import { conVariables } from "@/backend/tests/helpers/variablesDeEntorno";

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

describe("modeloDeOpenAI — el modelo de la app, creado en un solo lugar", () => {
  it("se crea una vez y después se reusa el mismo", () => {
    conVariables({ OPENAI_API_KEY: "sk-prueba", OPENAI_MODEL: "gpt-4o-mini" }, () => {
      const primero = modeloDeOpenAI();

      expect(modeloDeOpenAI()).toBe(primero);
      expect(primero).toMatchObject({ modelId: "gpt-4o-mini" });
    });
  });

  it("si cambia la configuración, se vuelve a crear con la nueva", () => {
    const antes = conVariables({ OPENAI_API_KEY: "sk-prueba", OPENAI_MODEL: "gpt-4o-mini" }, () => modeloDeOpenAI());
    const despues = conVariables({ OPENAI_API_KEY: "sk-prueba", OPENAI_MODEL: "gpt-4o" }, () => modeloDeOpenAI());

    expect(despues).not.toBe(antes);
    expect(despues).toMatchObject({ modelId: "gpt-4o" });
  });

  it("sin OPENAI_API_KEY falla aunque antes se haya creado uno con clave (no reusa uno viejo)", () => {
    conVariables({ OPENAI_API_KEY: "sk-prueba" }, () => modeloDeOpenAI());

    conVariables({ OPENAI_API_KEY: undefined }, () => {
      expect(() => modeloDeOpenAI()).toThrow(ErrorDeConfiguracion);
    });
  });
});
