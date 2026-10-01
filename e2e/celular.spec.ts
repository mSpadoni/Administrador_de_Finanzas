import { expect, test } from "./fixtures";

// El modo celular de punta a punta, en un navegador con pantalla de celular: los paneles que en la compu están fijos se
// abren desde el encabezado y se cierran con Escape, devolviendo el foco a quien los abrió.

test("la hamburguesa abre las conversaciones y Escape las cierra, con el foco de vuelta en el botón", async ({
  page,
}) => {
  await page.goto("/");
  const hamburguesa = page.getByRole("button", { name: "Conversaciones" });

  await hamburguesa.click();
  await expect(hamburguesa).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Nueva conversación" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(hamburguesa).toHaveAttribute("aria-expanded", "false");
  await expect(hamburguesa).toBeFocused();
});

test("con el menú abierto, Tab no se escapa del cajón: el resto de la página queda inerte", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Conversaciones" }).click();
  const cajon = page.getByRole("dialog", { name: "Menú principal" });
  await expect(cajon).toBeVisible();

  // Como con un <dialog> nativo, pasado el último botón el foco sale al navegador (o al overlay de desarrollo de
  // Next), pero nunca cae en el chat ni en el encabezado que quedaron detrás.
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    const fueraDelCajon = await page.evaluate(() => {
      const enfocado = document.activeElement;
      if (!enfocado || enfocado === document.body || enfocado.tagName === "NEXTJS-PORTAL") return null;
      return enfocado.closest('[role="dialog"]') ? null : enfocado.outerHTML.slice(0, 80);
    });
    expect(fueraDelCajon).toBeNull();
  }
  expect(await page.locator("main").evaluate((nodo) => nodo.closest("[inert]") !== null)).toBe(true);
});

test("el balance del mes se abre desde el encabezado y se cierra con Escape", async ({ page }) => {
  await page.goto("/");

  const cajon = page.locator("#panel-balance");
  await page.getByRole("button", { name: /balance/i }).click();
  await expect(cajon).toBeVisible();
  await expect(cajon.getByText("Ingresos")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(cajon).toHaveCount(0);
});

test("en el celular el campo arranca en el medio y se puede mandar un mensaje", async ({ page }) => {
  await page.goto("/");
  const campo = page.getByRole("textbox", { name: "Tu mensaje" });

  await campo.fill("Hola");
  await page.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByText("Hola, soy el asistente de prueba.", { exact: true })).toBeVisible();
  // Sin scroll horizontal: nada se sale del ancho de la pantalla.
  const anchoDeMas = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(anchoDeMas).toBeLessThanOrEqual(0);
});

test("con la letra al máximo (130 %), en el celular nada se sale del ancho de la pantalla", async ({ page }) => {
  // Como si la persona lo hubiera elegido antes: queda guardado en el navegador.
  await page.addInitScript(() => localStorage.setItem("tamano-de-letra", "130"));
  await page.goto("/");
  const campo = page.getByRole("textbox", { name: "Tu mensaje" });
  await campo.fill("Gasté 5000 en el súper con débito");
  await campo.press("Enter");
  await expect(page.getByRole("article", { name: "Movimiento registrado" })).toBeVisible();

  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("20.8px");
  const anchoDeMas = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(anchoDeMas).toBeLessThanOrEqual(0);
});
