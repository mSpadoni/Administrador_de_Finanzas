"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ItemConversacion } from "../sidebar";

/** Cuánto tiempo hay para deshacer un borrado (ms). Se pausa mientras el mouse o el foco están sobre el aviso. */
export const TIEMPO_PARA_DESHACER_MS = 7000;

type Opciones = {
  /** Server action que borra una conversación del usuario (la de siempre: el backend no cambia). */
  borrar: (id: string) => Promise<void>;
  /** El servidor la borró: hay que sacarla de la lista. */
  alBorrar: (conversacion: ItemConversacion) => void;
  /** El servidor no la pudo borrar: vuelve a la lista y hay que avisar. */
  alFallar: (conversacion: ItemConversacion) => void;
};

/**
 * Borrar una conversación con la opción de deshacer. El borrado es diferido: al pedirlo, la conversación solo se oculta
 * y se ofrece «Deshacer» durante un rato; recién cuando ese rato termina (o se cierra el aviso) se llama al servidor.
 * Deshacer no tiene que restaurar nada: nunca se borró. Si se cierra la página antes, no se borra (el error queda del
 * lado seguro). Si se pide borrar otra mientras hay una pendiente, la pendiente se borra en ese momento.
 */
export function useBorradoConDeshacer(opciones: Opciones) {
  const [pendiente, setPendiente] = useState<ItemConversacion | null>(null);
  const [borrando, setBorrando] = useState<readonly string[]>([]);
  const [pausado, setPausado] = useState(false);
  const restanteRef = useRef(TIEMPO_PARA_DESHACER_MS);
  // Las opciones y la pendiente más recientes, para el temporizador y para el desmontaje (sin reiniciar el tiempo cada
  // vez que el componente se vuelve a dibujar).
  const opcionesRef = useRef(opciones);
  const pendienteRef = useRef(pendiente);
  useEffect(() => {
    opcionesRef.current = opciones;
    pendienteRef.current = pendiente;
  });

  /** Borra de verdad en el servidor. Mientras tanto la conversación sigue oculta. */
  const borrarYa = useCallback(async (conversacion: ItemConversacion) => {
    setBorrando((ids) => [...ids, conversacion.id]);
    try {
      await opcionesRef.current.borrar(conversacion.id);
      opcionesRef.current.alBorrar(conversacion);
    } catch {
      opcionesRef.current.alFallar(conversacion);
    } finally {
      setBorrando((ids) => ids.filter((id) => id !== conversacion.id));
    }
  }, []);

  /** Termina el plazo (se cumplió el tiempo o se cerró el aviso): se borra. */
  const confirmar = useCallback(() => {
    const actual = pendienteRef.current;
    if (!actual) return;
    pendienteRef.current = null;
    setPendiente(null);
    void borrarYa(actual);
  }, [borrarYa]);

  /** Pide borrar una conversación: se oculta y empieza el plazo para deshacer. */
  const pedirBorrar = useCallback(
    (conversacion: ItemConversacion) => {
      confirmar(); // Si había otra pendiente, se borra ahora.
      restanteRef.current = TIEMPO_PARA_DESHACER_MS;
      setPausado(false);
      pendienteRef.current = conversacion;
      setPendiente(conversacion);
    },
    [confirmar]
  );

  /** Deshace el borrado pendiente: la conversación vuelve a la lista (nunca se borró). */
  const deshacer = useCallback(() => {
    pendienteRef.current = null;
    setPendiente(null);
  }, []);

  // El plazo corre mientras hay una pendiente y no está pausado; al pausar, se guarda lo que faltaba.
  useEffect(() => {
    if (!pendiente || pausado) return;
    const inicio = Date.now();
    const temporizador = setTimeout(confirmar, restanteRef.current);
    return () => {
      clearTimeout(temporizador);
      restanteRef.current = Math.max(0, restanteRef.current - (Date.now() - inicio));
    };
  }, [pendiente, pausado, confirmar]);

  // Si la lista desaparece (por ejemplo, al cerrar sesión) con una pendiente, se borra: ya se había pedido.
  useEffect(
    () => () => {
      const actual = pendienteRef.current;
      if (actual) void opcionesRef.current.borrar(actual.id).catch(() => undefined);
    },
    []
  );

  return {
    /** La conversación que se puede deshacer (null si no hay ninguna). */
    pendiente,
    /** ¿Esta conversación está oculta (pendiente o borrándose en el servidor)? */
    estaOculta: (id: string) => pendiente?.id === id || borrando.includes(id),
    pedirBorrar,
    deshacer,
    /** Cierra el aviso: borra ya, sin esperar. */
    confirmar,
    pausar: () => setPausado(true),
    reanudar: () => setPausado(false),
  };
}
