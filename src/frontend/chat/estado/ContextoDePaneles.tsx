"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { lanzarPanelesSinProveedor } from "./erroresEstado";

/** Qué paneles de la pantalla están abiertos: el menú lateral y el balance (en celular) y el panel de debug. */
type Paneles = {
  /** En celular, ¿está abierto el menú lateral (conversaciones)? Lo abre la hamburguesa del encabezado. */
  menuAbierto: boolean;
  setMenuAbierto: (abierto: boolean) => void;
  /** En celular y tablet, ¿está abierto el panel del balance del mes? Lo abre el botón del encabezado. */
  balanceAbierto: boolean;
  setBalanceAbierto: (abierto: boolean) => void;
  /** ¿Está abierto el panel de debug? (se abre desde el menú del perfil) */
  debugAbierto: boolean;
  abrirDebug: () => void;
  cerrarDebug: () => void;
};

const ContextoDePaneles = createContext<Paneles | null>(null);

/**
 * Los paneles de la pantalla, aparte del chat: abrir o cerrar uno no vuelve a dibujar la conversación, y una respuesta que
 * llega no vuelve a dibujar el encabezado ni los cajones. Todos arrancan cerrados.
 */
export function ProveedorDePaneles({ children }: { children: ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [balanceAbierto, setBalanceAbierto] = useState(false);
  const [debugAbierto, setDebugAbierto] = useState(false);
  const valor = useMemo<Paneles>(
    () => ({
      menuAbierto,
      setMenuAbierto,
      balanceAbierto,
      setBalanceAbierto,
      debugAbierto,
      abrirDebug: () => setDebugAbierto(true),
      cerrarDebug: () => setDebugAbierto(false),
    }),
    [menuAbierto, balanceAbierto, debugAbierto]
  );
  return <ContextoDePaneles.Provider value={valor}>{children}</ContextoDePaneles.Provider>;
}

/** Los paneles de la pantalla. Solo se puede usar adentro de <ProveedorDePaneles>. */
export function usePaneles(): Paneles {
  return useContext(ContextoDePaneles) ?? lanzarPanelesSinProveedor();
}
