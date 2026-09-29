import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

// Un servidor HTTP de verdad, en esta máquina y en un puerto libre, que responde lo que el test le indica.
// Sirve para probar cómo manejamos las respuestas de un servicio externo (500, 429, algo que no es un SVG) sin
// depender de internet ni de servicios públicos. No es un mock: el cliente hace un pedido HTTP real.

/** Lo que responde el servidor a un pedido. `demoraMs`: cuánto tarda en contestar (para probar timeouts). */
export type Respuesta = { status: number; headers?: Record<string, string>; cuerpo?: string; demoraMs?: number };

export type ServidorLocal = {
  url: string;
  /** Cuántos pedidos recibió (para comprobar reintentos). */
  pedidos: () => number;
  cerrar: () => Promise<void>;
};

/** Levanta el servidor. `responder` recibe el número de pedido (1, 2...) y dice qué contestar. */
export async function levantarServidor(responder: (numeroDePedido: number) => Respuesta): Promise<ServidorLocal> {
  let pedidos = 0;
  const servidor = createServer((pedido, respuesta) => {
    pedidos += 1;
    const { status, headers = {}, cuerpo = "", demoraMs = 0 } = responder(pedidos);
    pedido.resume(); // se descarta el cuerpo del pedido
    setTimeout(() => respuesta.writeHead(status, headers).end(cuerpo), demoraMs);
  });
  await new Promise<void>((listo) => servidor.listen(0, "127.0.0.1", listo));
  const { port } = servidor.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    pedidos: () => pedidos,
    cerrar: () =>
      new Promise((listo) => {
        servidor.closeAllConnections();
        servidor.close(() => listo());
      }),
  };
}
