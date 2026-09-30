import type { AsistenteUIMessage, EstadisticasDelPeriodo } from "@/shared/chat";
import BarraLateral from "./BarraLateral";
import ChatWindow from "./ChatWindow";
import EncabezadoDeLaApp from "./EncabezadoDeLaApp";
import { ProveedorDelChat } from "./ContextoDelChat";
import { ProveedorSidebar } from "./EstadoSidebar";
import { PanelDeDebugDelChat } from "./PanelDeDebug";
import CajonDelBalance from "./CajonDelBalance";
import PanelDelMes from "./PanelDelMes";
import type { ItemConversacion } from "./sidebar";

type Props = {
  usuario: { nombreVisible: string; primerNombre: string; avatarUrl: string | null };
  conversaciones: ItemConversacion[];
  conversacionId: string;
  mensajesIniciales: AsistenteUIMessage[];
  /** Las estadísticas del mes en curso para el panel «Este mes» (null si no se pudieron leer). */
  estadisticasDelMes: EstadisticasDelPeriodo | null;
  /** Server actions que conecta la página (las views no importan código del servidor). */
  cerrarSesion: () => Promise<void>;
  borrarConversacion: (id: string) => Promise<void>;
  /** Lee el historial de una conversación (para abrirla sin recargar la página). */
  leerConversacion: (id: string) => Promise<AsistenteUIMessage[]>;
  /** Le pide al servidor un título para la conversación según lo que se habló (null si no se pudo). */
  retitularConversacion: (id: string) => Promise<string | null>;
};

/**
 * La pantalla del usuario logueado: encabezado con el único <h1> (que lleva a una conversación nueva), la barra lateral
 * (<nav>) con atajos, conversaciones y perfil, el chat (<main>), el resumen «Este mes» (<aside>: fijo a la derecha en compu,
 * en un cajón en celular y tablet) y, si se abre, el panel de debug (<aside>). Es un Server Component: solo arma el layout;
 * el chat y la barra corren en el navegador.
 */
export default function PantallaDeChat({
  usuario,
  conversaciones,
  conversacionId,
  mensajesIniciales,
  estadisticasDelMes,
  cerrarSesion,
  borrarConversacion,
  leerConversacion,
  retitularConversacion,
}: Props) {
  // `relative overflow-hidden`: los textos solo para lector de pantalla (`sr-only`) son `absolute`; sin esto agrandaban la
  // página y dejaban scrollear por debajo del campo.
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* Skip link: con Tab, lo primero es poder saltar directo al chat (WCAG 2.4.1). */}
      <a
        href="#chat"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Ir al chat
      </a>
      {/* Estado compartido del sidebar y del chat: arrancan con lo que leyó la página y después se actualizan en el
          navegador (sin volver a consultar ni recargar): cambiar de conversación, crear o borrar una no vuelve a pedir la página. */}
      <ProveedorSidebar inicial={{ conversaciones }}>
        <ProveedorDelChat
          conversacionId={conversacionId}
          mensajesIniciales={mensajesIniciales}
          leerConversacion={leerConversacion}
          retitular={retitularConversacion}
        >
          <EncabezadoDeLaApp
            usuario={{ nombre: usuario.nombreVisible, avatarUrl: usuario.avatarUrl }}
            cerrarSesion={cerrarSesion}
          />
          <CajonDelBalance estadisticas={estadisticasDelMes} />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <BarraLateral
              borrar={borrarConversacion}
              usuario={{ nombre: usuario.nombreVisible, avatarUrl: usuario.avatarUrl }}
              cerrarSesion={cerrarSesion}
            />
            <ChatWindow nombre={usuario.primerNombre} />
            <PanelDelMes estadisticas={estadisticasDelMes} />
          </div>
          {/* El panel de debug (bonus): cerrado no existe; se abre desde el menú del perfil. */}
          <PanelDeDebugDelChat />
        </ProveedorDelChat>
      </ProveedorSidebar>
    </div>
  );
}
