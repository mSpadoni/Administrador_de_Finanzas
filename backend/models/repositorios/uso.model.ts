import "server-only";
import { datosOError } from "@/backend/lib/supabase/consultas";
import { crearClienteServidor, type ClienteSupabase } from "@/backend/lib/supabase/server";
import type { CodigoDeLimite, LimitesDeUso, TipoDeUso } from "@/backend/models/dominio/limiteDeUso";
import { lanzarCuotaConRespuestaInesperada } from "./erroresRepositorios";

/** Lo que puede devolver la función consumir_cuota de la base. */
const CODIGOS_DE_LIMITE: readonly CodigoDeLimite[] = ["limite_por_minuto", "limite_por_dia"];

/**
 * La cuota de uso del asistente (tabla uso_del_asistente). La cuenta la hace la base con la función consumir_cuota, en un
 * solo paso y con un candado por persona: dos pedidos a la vez no pueden pasarse del límite, y borrar conversaciones no
 * devuelve cuota (la tabla es aparte y la persona no la puede tocar).
 */
export class UsoModel {
  constructor(private readonly crearCliente: () => Promise<ClienteSupabase> = crearClienteServidor) {}

  /**
   * Si la persona logueada todavía tiene cuota para `tipo`, la gasta y devuelve null; si no, devuelve qué límite
   * alcanzó (y no gasta nada).
   */
  async consumir(tipo: TipoDeUso, limites: LimitesDeUso): Promise<CodigoDeLimite | null> {
    const supabase = await this.crearCliente();
    const codigo = datosOError(
      await supabase.rpc("consumir_cuota", { p_tipo: tipo, p_por_minuto: limites.porMinuto, p_por_dia: limites.porDia }),
      "No se pudo contar el uso del asistente"
    );
    if (codigo === null) return null;
    return CODIGOS_DE_LIMITE.find((limite) => limite === codigo) ?? lanzarCuotaConRespuestaInesperada(codigo);
  }
}

/** Instancia lista para usar desde la app (con el cliente del request). */
export const usoModel = new UsoModel();
