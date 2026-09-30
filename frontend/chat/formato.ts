// Cómo se escriben los montos, fechas y nombres en pantalla (es-AR). Funciones puras: las usan las tarjetas del chat y el
// panel «Este mes». Las fechas ("AAAA-MM-DD") se parten como texto: no pasan por Date, así la zona horaria no las mueve.

const CATEGORIAS_LEGIBLES: Record<string, string> = {
  supermercado: "Supermercado",
  comida_afuera: "Comida afuera",
  transporte: "Transporte",
  servicios: "Servicios",
  vivienda: "Vivienda",
  salud: "Salud",
  educacion: "Educación",
  ocio: "Ocio",
  ropa: "Ropa",
  suscripciones: "Suscripciones",
  sueldo: "Sueldo",
  trabajo_independiente: "Trabajo independiente",
  ventas: "Ventas",
  regalos: "Regalos",
  otros: "Otros",
};

const MEDIOS_LEGIBLES: Record<string, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
  billetera_virtual: "Billetera virtual",
};

const TIPOS_DE_DOLAR_LEGIBLES: Record<string, string> = {
  oficial: "Oficial",
  blue: "Blue",
  mep: "MEP",
  tarjeta: "Tarjeta",
};

/** «comida_afuera» → «Comida afuera». Un valor que no conoce lo muestra con guiones bajos como espacios. */
const legible = (tabla: Record<string, string>, valor: string) => tabla[valor] ?? valor.replaceAll("_", " ");

export const nombreDeCategoria = (categoria: string) => legible(CATEGORIAS_LEGIBLES, categoria);
export const nombreDelMedioDePago = (medio: string) => legible(MEDIOS_LEGIBLES, medio);
export const nombreDelTipoDeDolar = (tipo: string) => legible(TIPOS_DE_DOLAR_LEGIBLES, tipo);

/** Los enteros van sin decimales; el resto, con dos ($ 15.000 · $ 1.234,50). */
function conDecimalesSegunElMonto(monto: number) {
  return { minimumFractionDigits: Number.isInteger(monto) ? 0 : 2, maximumFractionDigits: 2 };
}

/** Pesos argentinos: «$ 15.000». */
export function formatoPesos(monto: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    ...conDecimalesSegunElMonto(monto),
  }).format(monto);
}

/** Dólares: «US$ 100». */
function formatoDolares(monto: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    ...conDecimalesSegunElMonto(monto),
  }).format(monto);
}

/** Un monto en su moneda. */
export function formatoMonto(monto: number, moneda: "ARS" | "USD"): string {
  return moneda === "USD" ? formatoDolares(monto) : formatoPesos(monto);
}

/** «2026-09-29» → «29/09/2026». */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** Cuándo se actualizó una cotización (ISO 8601), en hora de Argentina: «29/09 14:30». */
export function horaDeActualizacion(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "sin dato";
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  // es-AR no respeta "2-digit" en el mes ("29/9"): se completa con ceros a mano.
  const de = (tipo: string) => (partes.find((parte) => parte.type === tipo)?.value ?? "").padStart(2, "0");
  return `${de("day")}/${de("month")} ${de("hour")}:${de("minute")}`;
}

/** El mes de una fecha: «2026-09-15» → «septiembre de 2026». */
export function nombreDelMes(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${fecha}T00:00:00Z`)
  );
}

/** Un porcentaje con coma decimal y sin ceros de más: 12,5 → «12,5%» · 40 → «40%». */
export function formatoPorcentaje(porcentaje: number): string {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(porcentaje)}%`;
}

/** Cómo cambiaron los gastos contra el período anterior, con texto además de la flecha. `null`: antes no había gastos. */
export function textoDeVariacion(porcentaje: number | null): string {
  if (porcentaje === null) return "Sin gastos en el período anterior para comparar";
  if (porcentaje === 0) return "Igual que el período anterior";
  const cambio = formatoPorcentaje(Math.abs(porcentaje));
  return porcentaje > 0 ? `▲ ${cambio} más que el período anterior` : `▼ ${cambio} menos que el período anterior`;
}

/** Cuánto tardó algo: menos de un minuto en segundos con coma (0,8 s · 3,4 s · 12 s); más, en minutos («1 min 5 s»). */
export function formatoDuracion(ms: number): string {
  const segundos = ms / 1000;
  if (segundos < 10) return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(segundos)} s`;
  if (segundos < 60) return `${Math.round(segundos)} s`;
  const minutos = Math.floor(segundos / 60);
  return `${minutos} min ${Math.round(segundos - minutos * 60)} s`;
}

/** Una cantidad de tokens con punto de miles: 1230 → «1.230». */
export function formatoTokens(tokens: number): string {
  return new Intl.NumberFormat("es-AR").format(tokens);
}
