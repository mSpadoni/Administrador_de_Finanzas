# Finanzas personales

Asistente de chat con el que una persona en Argentina registra sus gastos e ingresos en lenguaje natural, los consulta y los convierte entre pesos y dólares con la cotización del día.

## Language

### Movimientos

**Movimiento**:
Un gasto o un ingreso de la persona, con su monto, moneda, categoría, medio de pago, descripción y fecha.
_Avoid_: Transacción, operación, registro

**Gasto**:
Un movimiento de plata que sale. Una compra en cuotas es un solo gasto por el total, en la fecha de compra.
_Avoid_: Egreso, pago, compra (como término general)

**Ingreso**:
Un movimiento de plata que entra (sueldo, un trabajo, una venta).
_Avoid_: Entrada, cobro

**Categoría**:
La clase de un movimiento, de una lista fija: una lista para gastos y otra para ingresos.
_Avoid_: Rubro, etiqueta, tag

**Medio de pago**:
Cómo se pagó o se cobró: efectivo, débito, crédito, transferencia o billetera virtual.
_Avoid_: Forma de pago, método

**Fecha del movimiento**:
El día en que ocurrió el movimiento según la persona (hora de Argentina), no el momento en que se registró.
_Avoid_: Fecha de carga

### Monedas y cotizaciones

**Moneda**:
Pesos argentinos (ARS) o dólares (USD). Un movimiento se guarda en la moneda en que ocurrió.
_Avoid_: Divisa

**Tipo de dólar**:
Cuál de las cotizaciones del dólar se usa: oficial, blue, MEP o tarjeta.
_Avoid_: Clase de dólar

**Cotización**:
Cuántos pesos vale un dólar de un tipo de dólar en un momento dado, según la fuente externa.
_Avoid_: Tipo de cambio, precio del dólar

**Monto en pesos**:
Lo que valía un movimiento en dólares, en pesos, con la cotización del día en que se registró (oficial salvo que la persona diga otro tipo de dólar). No cambia después, aunque cambie el dólar.
_Avoid_: Valor convertido

**Conversión**:
Pasar un monto de una moneda a otra con la cotización actual, a pedido de la persona; no modifica ningún movimiento.
_Avoid_: Cambio

### Consultas

**Período**:
El rango de fechas de una consulta: un día, una semana (de lunes a domingo), un mes calendario o un rango explícito, en hora de Argentina.
_Avoid_: Intervalo, lapso

**Balance**:
Ingresos menos gastos de un período, en pesos.
_Avoid_: Saldo, resultado

**Período anterior**:
El período con el que se compara uno: el mes calendario anterior para un mes, la semana anterior para una semana, el día anterior para un día, o la misma cantidad de días justo antes para un rango.
_Avoid_: Período previo, mes pasado (como término general)

**Estadísticas**:
Totales por categoría, promedio diario de gastos y variación de los gastos contra el período anterior, calculados sobre los movimientos de un período.
_Avoid_: Métricas, reporte
