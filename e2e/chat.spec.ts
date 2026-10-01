import AxeBuilder from "@axe-core/playwright";
import { test as base, expect as expectBase } from "@playwright/test";
import { expect, test } from "./fixtures";

// Los flujos críticos de punta a punta (REGLAS-SKILLS 3.3): enviar un mensaje y verlo guardado, registrar un gasto con la
// tool y ver el resumen del mes, un error del asistente con su reintento, borrar una conversación, y la accesibilidad de
// la pantalla en los dos temas. La base es la local (Docker); OpenAI y dolarapi.com son falsos (e2e/servidores).

base.describe("sin sesión", () => {
  base("la pantalla de inicio ofrece entrar con Google y la API del chat pide sesión", async ({ page, request }) => {
    await page.goto("/");

    await expectBase(page.getByRole("heading", { level: 1, name: "Administrador de Finanzas" })).toBeVisible();
    await expectBase(page.getByRole("button", { name: "Ingresar con Google" })).toBeVisible();

    const respuesta = await request.post("/api/chat", { data: {} });
    expectBase(respuesta.status()).toBe(401);
    expectBase((await respuesta.json()).error.codigo).toBe("no_autenticado");
  });
});

test.describe("el chat", () => {
  test("manda un mensaje, ve la respuesta y al recargar la conversación sigue ahí", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/conversacion\/[0-9a-f-]{36}$/);

    const campo = page.getByRole("textbox", { name: "Tu mensaje" });
    await campo.fill("Hola");
    await campo.press("Enter");

    await expect(page.getByText("Hola, soy el asistente de prueba.", { exact: true })).toBeVisible();
    await expect(campo).toHaveValue("");
    // La conversación aparece en la barra lateral (con el título que propone el asistente).
    await expect(page.getByRole("link", { name: "Charla de prueba" })).toBeVisible();

    await page.reload();
    await expect(page.getByText("Hola, soy el asistente de prueba.", { exact: true })).toBeVisible();
    await expect(page.getByText("Hola", { exact: true })).toBeVisible();
  });

  test("registra un gasto: se ve la tarjeta y el resumen del mes se actualiza sin recargar", async ({ page }) => {
    await page.goto("/");
    const esteMes = page.getByRole("complementary", { name: "Este mes" });
    await expect(esteMes.getByText("Todavía no registraste gastos este mes.", { exact: false })).toBeVisible();

    const campo = page.getByRole("textbox", { name: "Tu mensaje" });
    await campo.fill("Gasté 5000 en el súper con débito");
    await campo.press("Enter");

    const tarjeta = page.getByRole("article", { name: "Movimiento registrado" });
    await expect(tarjeta).toContainText("Gasto registrado");
    await expect(tarjeta).toContainText("5.000");
    await expect(page.getByText("Listo: registré un gasto de $ 5.000 en supermercado.", { exact: true })).toBeVisible();
    // El panel «Este mes» se vuelve a leer solo, sin recargar la página.
    await expect(esteMes.getByText("Supermercado")).toBeVisible();
  });

  test("si el asistente está saturado, se ve el error con «Reintentar», y reintentando sale bien", async ({ page }) => {
    await page.goto("/");
    const campo = page.getByRole("textbox", { name: "Tu mensaje" });
    await campo.fill("¿Estás saturado?");
    await campo.press("Enter");

    // (Next agrega su propio role="alert" vacío para anunciar cambios de ruta: se busca el aviso por su texto.)
    const aviso = page.getByRole("alert").filter({ hasText: "El asistente está recibiendo demasiadas consultas" });
    await expect(aviso).toBeVisible();
    await aviso.getByRole("button", { name: "Reintentar" }).click();

    await expect(page.getByText("Hola, soy el asistente de prueba.", { exact: true })).toBeVisible();
    await expect(aviso).toHaveCount(0);
  });

  test("borra una conversación con confirmación: cancelar no borra; confirmar sí, y no vuelve al recargar", async ({
    page,
  }) => {
    await page.goto("/");
    const campo = page.getByRole("textbox", { name: "Tu mensaje" });
    await campo.fill("Hola");
    await campo.press("Enter");
    const enLaLista = page.getByRole("link", { name: "Charla de prueba" });
    await expect(enLaLista).toBeVisible();

    const borrar = page.getByRole("button", { name: "Borrar la conversación «Charla de prueba»" });
    await borrar.click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    await expect(enLaLista).toBeVisible();

    await borrar.click();
    await page.getByRole("dialog").getByRole("button", { name: "Borrar" }).click();
    await expect(enLaLista).toHaveCount(0);
    // Era la abierta: queda una conversación nueva, vacía.
    await expect(page.getByRole("textbox", { name: "Tu mensaje" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("link", { name: "Charla de prueba" })).toHaveCount(0);
  });
});

test.describe("accesibilidad y tema", () => {
  for (const tema of ["light", "dark"] as const) {
    test(`la pantalla del chat no tiene problemas de accesibilidad graves (tema ${tema === "light" ? "claro" : "oscuro"})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: tema });
      await page.goto("/");
      const campo = page.getByRole("textbox", { name: "Tu mensaje" });
      await campo.fill("Gasté 5000 en el súper con débito");
      await campo.press("Enter");
      await expect(page.getByRole("article", { name: "Movimiento registrado" })).toBeVisible();
      // Se mide lo que la persona ve: con el título ya puesto y sin animaciones a mitad de camino (un texto que está
      // apareciendo todavía es semitransparente y daría un contraste que nadie llega a leer).
      await expect(page.getByRole("link", { name: "Charla de prueba" })).toBeVisible();
      await page.evaluate(() => Promise.all(document.getAnimations().map((animacion) => animacion.finished)));

      const resultado = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const graves = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");

      expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("el tamaño de letra se elige en el menú de la cuenta, agranda toda la página y se recuerda", async ({
    page,
  }) => {
    await page.goto("/");
    const letraBase = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
    expect(await letraBase()).toBe("16px");

    await page.getByRole("button", { name: "Cuenta de Mateo Prueba" }).click();
    await page.getByRole("menuitemradio", { name: "Muy grande" }).click();

    // 125 % de 16 px. Todo está en rem, así que el resto de la página crece con esto.
    expect(await letraBase()).toBe("20px");
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Tu mensaje" })).toBeVisible();
    expect(await letraBase()).toBe("20px");
  });

  test("con el tema oscuro del sistema, la app se pone oscura", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(11, 18, 32)");
  });
});
