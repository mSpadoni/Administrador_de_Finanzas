-- Firma de las respuestas del asistente. La persona puede insertar filas en `mensajes` de sus conversaciones (RLS lo
-- permite: el servidor guarda con la sesión de ella), así que podría inventar respuestas «del asistente» con resultados
-- de tools falsos y dárselas al modelo. El servidor firma cada respuesta con una clave que solo conoce él
-- (FIRMA_DE_MENSAJES) y, al armar lo que ve el modelo, descarta las que no tienen una firma válida.
alter table mensajes add column firma text;
