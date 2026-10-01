// Los errores de frontend/chat que se lanzan: un componente usado donde no corresponde. Son errores del programador, no del
// usuario (a él le muestran su aviso los componentes AvisoDeError y app/error.tsx).

/** Un componente que necesita el estado del sidebar se usó fuera de <ProveedorSidebar>. */
export function lanzarSidebarSinProveedor(): never {
  throw new Error("useSidebar se usa adentro de <ProveedorSidebar>.");
}

/** Un componente que necesita el chat se usó fuera de <ProveedorDelChat>. */
export function lanzarChatSinProveedor(): never {
  throw new Error("useChatEnPantalla se usa adentro de <ProveedorDelChat>.");
}

/** Un componente que necesita los paneles de la pantalla se usó fuera de <ProveedorDePaneles>. */
export function lanzarPanelesSinProveedor(): never {
  throw new Error("usePaneles se usa adentro de <ProveedorDePaneles> (lo pone ProveedorDelChat).");
}

/** Un componente que necesita el borrador del campo se usó fuera de <ProveedorDelBorrador>. */
export function lanzarBorradorSinProveedor(): never {
  throw new Error("useBorrador se usa adentro de <ProveedorDelBorrador> (lo pone ProveedorDelChat).");
}
