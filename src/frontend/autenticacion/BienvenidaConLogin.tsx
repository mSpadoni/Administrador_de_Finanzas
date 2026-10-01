import LoginButton from "./LoginButton";

type Props = {
  /** Server action que arranca el login con Google (la conecta la página: el frontend no importa código del servidor). */
  ingresar: () => Promise<void>;
  /** ¿Falló el login? (la página lo sabe por la URL: `/?error=login`). */
  falloElLogin: boolean;
};

/** El aviso cuando no se pudo iniciar la sesión: qué pasó y qué hacer (heurística #9). Se anuncia solo (role="alert"). */
function AvisoDeLoginFallido() {
  return (
    <div role="alert" className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-medium">
        <span aria-hidden="true">⚠ </span>
        No pudimos iniciar tu sesión.
      </p>
      <p className="mt-1">
        Probá ingresar de nuevo. Si cancelaste en la pantalla de Google, no pasa nada: volvé a intentarlo cuando
        quieras.
      </p>
    </div>
  );
}

/**
 * Pantalla de bienvenida para quien no tiene sesión: qué hace la app, el aviso si falló el login y el botón de Google.
 * Mismo marco que PantallaDeAviso.
 */
export default function BienvenidaConLogin({ ingresar, falloElLogin }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Administrador de Finanzas</h1>
        <p className="mt-2 text-slate-700">
          Contale al asistente tus gastos e ingresos como se los contarías a alguien: los registra, te dice en qué se va
          la plata y a cuánto está el dólar.
        </p>

        {/* `condición && (<jsx>)`: si la condición es true muestra el bloque; si es false no muestra nada. */}
        {falloElLogin && <AvisoDeLoginFallido />}

        <div className="mt-6">
          <p className="mb-4 text-sm text-slate-700">Ingresá con tu cuenta de Google para empezar.</p>
          <LoginButton accion={ingresar} />
        </div>
      </div>
    </main>
  );
}
