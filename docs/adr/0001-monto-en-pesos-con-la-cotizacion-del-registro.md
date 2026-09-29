# El monto en pesos de un movimiento en dólares se fija con la cotización del día en que se registra

Un movimiento en USD guarda su monto original y, además, su monto en pesos calculado con la cotización de ese día (oficial, salvo que la persona pida otro tipo de dólar), junto con el tipo de dólar y la cotización usada. Así los totales y el balance de un mes en pesos no cambian cuando cambia el dólar, y se puede explicar de dónde sale cada número.

## Considered Options

- **Convertir siempre con la cotización actual**: no hay que guardar nada extra, pero el total de un mes pasado cambia todos los días con el dólar y deja de coincidir con lo que la persona gastó de verdad.
