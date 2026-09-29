/**
 * Corre `accion` con las variables de entorno indicadas (undefined = borrada) y después restaura las originales,
 * aunque `accion` tire un error. Sin mocks: cambia process.env de verdad, solo durante `accion`.
 */
export function conVariables<T>(variables: Record<string, string | undefined>, accion: () => T): T {
  const originales = Object.fromEntries(Object.keys(variables).map((nombre) => [nombre, process.env[nombre]]));
  const aplicar = (valores: Record<string, string | undefined>) => {
    for (const [nombre, valor] of Object.entries(valores)) {
      if (valor === undefined) delete process.env[nombre];
      else process.env[nombre] = valor;
    }
  };
  aplicar(variables);
  try {
    return accion();
  } finally {
    aplicar(originales);
  }
}

/** Igual que conVariables, para acciones asíncronas (restaura cuando la promesa termina). */
export async function conVariablesAsync<T>(
  variables: Record<string, string | undefined>,
  accion: () => Promise<T>
): Promise<T> {
  const originales = Object.fromEntries(Object.keys(variables).map((nombre) => [nombre, process.env[nombre]]));
  for (const [nombre, valor] of Object.entries(variables)) {
    if (valor === undefined) delete process.env[nombre];
    else process.env[nombre] = valor;
  }
  try {
    return await accion();
  } finally {
    for (const [nombre, valor] of Object.entries(originales)) {
      if (valor === undefined) delete process.env[nombre];
      else process.env[nombre] = valor;
    }
  }
}
