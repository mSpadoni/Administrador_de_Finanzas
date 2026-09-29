import type { AsistenteUIMessage } from "@/shared/chat";
import LoginButton from "@/views/LoginButton";
import ChatWindow from "./ChatWindow";
import { ProveedorSidebar } from "./EstadoSidebar";
import SidebarConversaciones from "./SidebarConversaciones";
import type { ItemConversacion } from "./sidebar";

type Props = {
  usuario: { nombreVisible: string; primerNombre: string };
  conversaciones: ItemConversacion[];
  conversacionId: string;
  mensajesIniciales: AsistenteUIMessage[];
  /** Server actions que conecta la página (las views no importan código del servidor). */
  cerrarSesion: () => Promise<void>;
  borrarConversacion: (id: string) => Promise<void>;
};

/**
 * La pantalla del usuario logueado: encabezado con el único <h1>, la lista de conversaciones (<nav>) al costado
 * el chat (<main>) y el panel de debug (<aside>). Es un Server Component: solo arma el layout; el chat y la lista corren en el navegador.
 */
export default function PantallaDeChat({
  usuario,
  conversaciones,
  conversacionId,
  mensajesIniciales,
  cerrarSesion,
  borrarConversacion,
}: Props) {
  return (
    <div className="flex h-dvh flex-col">
      {/* Skip link: con Tab, lo primero es poder saltar directo al chat (WCAG 2.4.1). */}
      <a
        href="#chat"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Ir al chat
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <h1 className="text-lg font-bold text-slate-900">Administrador de Finanzas</h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-700 sm:inline">{usuario.nombreVisible}</span>
            <LoginButton accion={cerrarSesion} variante="salir" />
          </div>
        </div>
      </header>
      {/* Estado compartido del sidebar: arranca con lo que leyó la página y se actualiza desde el chat sin
          volver a consultar. key: al abrir otra conversación, arranca de nuevo con los datos frescos. */}
      <ProveedorSidebar key={conversacionId} inicial={{ conversaciones }}>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <SidebarConversaciones actualId={conversacionId} borrar={borrarConversacion} />
          {/* El chat (<main>) y el panel de debug (<aside>). key: al cambiar de conversación, arranca de cero
              con el historial de la otra. */}
          <ChatWindow
            key={conversacionId}
            conversacionId={conversacionId}
            mensajesIniciales={mensajesIniciales}
            nombre={usuario.primerNombre}
          />
        </div>
      </ProveedorSidebar>
    </div>
  );
}
