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
