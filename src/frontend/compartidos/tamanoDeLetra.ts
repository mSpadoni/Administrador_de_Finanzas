import { esTamanoDeLetra } from "./validacionCompartidos";

// El tamaño de letra de toda la app, para quien necesita leer más grande (accesibilidad). Todos los tamaños de la app
// están en rem (relativos a la letra base de la página), así que alcanza con cambiar la letra base para que crezca todo
// parejo: textos, botones y espacios. La elección se guarda en el navegador (localStorage) y se aplica antes de dibujar
// la página (SCRIPT_DEL_TAMANO_DE_LETRA), así no se ve un instante en tamaño normal.

/** Las opciones, de menor a mayor. El tamaño de cada una está en globals.css (`html[data-letra=...]`). */
export const TAMANOS_DE_LETRA = [
  { id: "normal", nombre: "Normal" },
  { id: "grande", nombre: "Grande" },
  { id: "muy-grande", nombre: "Muy grande" },
] as const;

export type TamanoDeLetra = (typeof TAMANOS_DE_LETRA)[number]["id"];

/** Dónde se guarda la elección en el navegador. */
const CLAVE_DEL_TAMANO_DE_LETRA = "tamano-de-letra";

const TAMANOS_AGRANDADOS = TAMANOS_DE_LETRA.map(({ id }) => id).filter((id) => id !== "normal");

/**
 * Lo que corre en el <head> antes de dibujar la página: si hay un tamaño guardado (y es uno de los que existen), lo pone
 * en `<html data-letra="...">`. Va como texto porque se ejecuta antes que React. Si el navegador no deja leer
 * localStorage (modo privado estricto), queda el tamaño normal.
 */
export const SCRIPT_DEL_TAMANO_DE_LETRA = `try{var t=localStorage.getItem(${JSON.stringify(
  CLAVE_DEL_TAMANO_DE_LETRA
)});if(${JSON.stringify(TAMANOS_AGRANDADOS)}.indexOf(t)>=0)document.documentElement.dataset.letra=t}catch(e){}`;

/** El tamaño que tiene la página ahora (el que puso el script o la última elección). */
export function tamanoDeLetraActual(): TamanoDeLetra {
  const actual = document.documentElement.dataset.letra;
  return esTamanoDeLetra(actual) ? actual : "normal";
}

/** Cambia el tamaño de la página y lo guarda para la próxima vez. */
export function aplicarTamanoDeLetra(tamano: TamanoDeLetra): void {
  const raiz = document.documentElement;
  if (tamano === "normal") delete raiz.dataset.letra;
  else raiz.dataset.letra = tamano;
  try {
    if (tamano === "normal") localStorage.removeItem(CLAVE_DEL_TAMANO_DE_LETRA);
    else localStorage.setItem(CLAVE_DEL_TAMANO_DE_LETRA, tamano);
  } catch {
    // Sin acceso a localStorage (modo privado estricto): el tamaño se aplica igual, solo que no se recuerda.
  }
}
