import { esPorcentajeDeLetra } from "./validacionCompartidos";

// El tamaño de letra de toda la app (accesibilidad): un porcentaje del tamaño normal, que la persona ajusta con una
// barra. Todos los tamaños de la app están en rem (relativos a la letra base de la página), así que alcanza con cambiar
// la letra base de <html> para que crezca o se achique todo parejo: textos, botones y espacios. Se guarda en el navegador
// (localStorage) y se aplica antes de dibujar la página (SCRIPT_DEL_TAMANO_DE_LETRA), así no se ve un instante en normal.

/**
 * Hasta dónde se puede achicar o agrandar, y de a cuánto. No baja de 85 %: con menos, los textos más chicos de la app
 * quedarían en unos 10 px, ya difíciles de leer. No pasa de 130 %: más grande, los paneles se aprietan demasiado.
 */
export const LIMITES_DE_LETRA = { minimo: 85, normal: 100, maximo: 130, paso: 5 } as const;

/** Dónde se guarda la elección en el navegador. */
const CLAVE_DEL_TAMANO_DE_LETRA = "tamano-de-letra";

const { minimo, normal, maximo, paso } = LIMITES_DE_LETRA;

/**
 * Lo que corre en el <head> antes de dibujar la página: si hay un porcentaje guardado y es válido (entre el mínimo y el
 * máximo, de a `paso`), lo pone como letra base. Va como texto porque se ejecuta antes que React. Cualquier otra cosa
 * guardada (o un navegador que no deja leer localStorage) deja la letra normal.
 */
export const SCRIPT_DEL_TAMANO_DE_LETRA = `try{var p=Number(localStorage.getItem(${JSON.stringify(
  CLAVE_DEL_TAMANO_DE_LETRA
)}));if(p>=${minimo}&&p<=${maximo}&&(p-${minimo})%${paso}===0&&p!==${normal})document.documentElement.style.fontSize=p+"%"}catch(e){}`;

/** El porcentaje que tiene la página ahora (el que puso el script o la última elección). */
export function tamanoDeLetraActual(): number {
  const actual = Number.parseFloat(document.documentElement.style.fontSize);
  return esPorcentajeDeLetra(actual, LIMITES_DE_LETRA) ? actual : normal;
}

/** Cambia la letra de la página y la guarda para la próxima vez. Un porcentaje fuera de los límites no se aplica. */
export function aplicarTamanoDeLetra(porcentaje: number): void {
  if (!esPorcentajeDeLetra(porcentaje, LIMITES_DE_LETRA)) return;
  document.documentElement.style.fontSize = porcentaje === normal ? "" : `${porcentaje}%`;
  try {
    if (porcentaje === normal) localStorage.removeItem(CLAVE_DEL_TAMANO_DE_LETRA);
    else localStorage.setItem(CLAVE_DEL_TAMANO_DE_LETRA, String(porcentaje));
  } catch {
    // Sin acceso a localStorage (modo privado estricto): el tamaño se aplica igual, solo que no se recuerda.
  }
}
