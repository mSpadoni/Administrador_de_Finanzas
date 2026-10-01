"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { lanzarBorradorSinProveedor } from "./erroresEstado";

/** Lo que la persona está escribiendo y todavía no mandó. */
type Borrador = { borrador: string; setBorrador: (texto: string) => void };

const ContextoDelBorrador = createContext<Borrador | null>(null);

/**
 * El borrador del campo de texto, aparte del chat: cada letra que se escribe cambia solo esto, así que vuelve a dibujar el
 * campo y no la conversación entera. Al cambiar de conversación (`conversacionId`) el campo queda vacío.
 */
export function ProveedorDelBorrador({ conversacionId, children }: { conversacionId: string; children: ReactNode }) {
  const [borrador, setBorrador] = useState("");
  useEffect(() => setBorrador(""), [conversacionId]);
  const valor = useMemo(() => ({ borrador, setBorrador }), [borrador]);
  return <ContextoDelBorrador.Provider value={valor}>{children}</ContextoDelBorrador.Provider>;
}

/** El borrador del campo. Solo se puede usar adentro de <ProveedorDelBorrador>. */
export function useBorrador(): Borrador {
  return useContext(ContextoDelBorrador) ?? lanzarBorradorSinProveedor();
}
