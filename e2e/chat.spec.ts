import AxeBuilder from "@axe-core/playwright";
import { test as base, expect as expectBase } from "@playwright/test";
import { expect, test } from "./fixtures";

// Los flujos críticos de punta a punta (REGLAS-SKILLS 3.3): enviar un mensaje y verlo guardado, registrar un gasto con la
// tool y ver el resumen del mes, un error del asistente con su reintento, borrar una conversación (y deshacerlo), y la accesibilidad de
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

  test("borra una conversación con confirmación: cancelar no borra; confirmar y «Deshacer» la recupera; confirmar y cerrar el aviso la borra y no vuelve al recargar", async ({
    page,
  }) => {
    await page.goto("/");
    const campo = page.getByRole("textbox", { name: "Tu mensaje" });
    await campo.fill("Hola");
    await campo.press("Enter");
    const enLaLista = page.getByRole("link", { name: "Charla de prueba" });
    await expect(enLaLista).toBeVisible();

    const borrar = page.getByRole("button", { name: "Borrar la conversación «Charla de prueba»" });
    const confirmar = () => page.getByRole("dialog").getByRole("button", { name: "Borrar" }).click();
    await borrar.click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText(/^Borraste «/)).toHaveCount(0);
    await expect(enLaLista).toBeVisible();

    await borrar.click();
    await confirmar();
    await expect(page.getByText("Borraste «Charla de prueba».")).toBeVisible();
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(enLaLista).toBeVisible();
    // Era la abierta: al deshacer vuelve a estar en pantalla, con sus mensajes.
    await expect(page.getByText("Hola, soy el asistente de prueba.", { exact: true })).toBeVisible();

    await borrar.click();
    await confirmar();
    await page.getByRole("button", { name: "Cerrar el aviso" }).click();
    await expect(enLaLista).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Deshacer" })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Tu mensaje" })).toBeVisible();
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

  test("el tamaño de letra se ajusta con una barra: agranda o achica toda la página y se recuerda", async ({
    page,
  }) => {
    await page.goto("/");
    const letraBase = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
    expect(await letraBase()).toBe("16px");

    await page.getByRole("button", { name: "Cuenta de Mateo Prueba" }).click();
    await page.getByRole("menuitem", { name: "Tamaño de letra…" }).click();
    const barra = page.getByRole("slider", { name: "Tamaño de letra" });
    await expect(barra).toBeFocused();

    // Con el teclado, como la mueve quien no usa el mouse: End lleva al máximo (130 % de 16 px) y Home al mínimo (85 %).
    await page.keyboard.press("End");
    expect(await letraBase()).toBe("20.8px");
    await page.keyboard.press("Home");
    expect(await letraBase()).toBe("13.6px");
    await page.keyboard.press("ArrowRight");
    expect(await letraBase()).toBe("14.4px");
    await page.getByRole("button", { name: "Listo" }).click();

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Tu mensaje" })).toBeVisible();
    expect(await letraBase()).toBe("14.4px");
  });

  test("solo con el teclado se llega a la barra lateral y a las opciones del menú de la cuenta", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("textbox", { name: "Tu mensaje" })).toBeVisible();

    // Tab hasta el botón de la cuenta (al pie de la barra lateral), pasando por «Nueva conversación».
    const cuenta = page.getByRole("button", { name: "Cuenta de Mateo Prueba" });
    let pasoPorLaBarra = false;
    for (let i = 0; i < 20 && !(await cuenta.evaluate((b) => b === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
      if (await page.getByRole("link", { name: "Nueva conversación" }).evaluate((l) => l === document.activeElement))
        pasoPorLaBarra = true;
    }
    expect(pasoPorLaBarra).toBe(true);
    await expect(cuenta).toBeFocused();

    // Desde el campo, Tab llega al panel «Este mes» (tiene su propio scroll).
    await page.getByRole("textbox", { name: "Tu mensaje" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("complementary", { name: "Este mes" })).toBeFocused();
    await cuenta.focus();

    // Enter abre el menú y Tab recorre las opciones.
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: "Panel de debug" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("menuitem", { name: "Tamaño de letra…" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Tamaño de letra" })).toBeVisible();
  });

  test("solo con el teclado se puede scrollear una conversación larga (Inicio y Fin)", async ({ page }) => {
    // Seis idas y vueltas con el servidor de desarrollo: más que el minuto por defecto.
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto("/");
    const campo = page.getByRole("textbox", { name: "Tu mensaje" });
    for (let i = 1; i <= 6; i++) {
      await campo.fill(`Hola ${i}`);
      await campo.press("Enter");
      await expect(page.getByText("Hola, soy el asistente de prueba.", { exact: true })).toHaveCount(i, {
        timeout: 30_000,
      });
      // Hasta que la respuesta no termina del todo, el campo no deja mandar otra (vuelve el botón «Enviar»).
      await expect(page.getByRole("button", { name: "Enviar" })).toBeVisible();
    }
    const lista = page.getByRole("list", { name: "Mensajes de la conversación" });
    const zona = () =>
      lista.evaluate((l) => {
        const z = l.closest(".overflow-y-auto") as HTMLElement;
        return { arriba: z.scrollTop, alFinal: Math.abs(z.scrollHeight - z.clientHeight - z.scrollTop) < 2 };
      });

    // Desde el campo: Shift+Tab pasa por «Atajos» y llega a la lista (con la respuesta ya terminada: mientras el
    // asistente responde, «Atajos» está deshabilitado y Tab lo saltea).
    await expect(page.getByRole("button", { name: "Atajos" })).toBeEnabled();
    await campo.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(lista).toBeFocused();

    // La conversación no entra en la pantalla: está scrolleada abajo (si no, el test no probaría nada).
    expect((await zona()).arriba).toBeGreaterThan(0);
    await expect(page.getByText("Hola 1", { exact: true })).not.toBeInViewport();

    await page.keyboard.press("Home");
    await expect.poll(async () => (await zona()).arriba).toBe(0);
    await expect(page.getByText("Hola 1", { exact: true })).toBeInViewport();
    await page.keyboard.press("End");
    await expect.poll(async () => (await zona()).alFinal).toBe(true);
    await expect(page.getByText("Hola 6", { exact: true })).toBeInViewport();
  });

  test("con el tema oscuro del sistema, la app se pone oscura", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(11, 18, 32)");
  });
});
