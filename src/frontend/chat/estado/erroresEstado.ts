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
