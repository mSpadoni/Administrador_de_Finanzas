import PantallaDeAviso from "@/frontend/compartidos/PantallaDeAviso";

/** Lo que ve el usuario si entra a una dirección que no existe (ej. un link de conversación mal copiado). */
export default function PaginaNoEncontrada() {
  return (
    <PantallaDeAviso titulo="No encontramos esta página">
      <p>Puede que el link esté mal copiado. Desde el inicio podés abrir tus conversaciones o empezar una nueva.</p>
    </PantallaDeAviso>
  );
}
