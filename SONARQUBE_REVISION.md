# Revisión de issues de SonarQube — Carretero-frontend

- **Proyecto:** `JhersonMes_Carretero-frontend` (SonarQube Cloud, organización `jhersonmes`)
- **Fecha:** 03/11/2026
- **Alcance:** 89 issues abiertos de la rama `master` (código completo, no solo código nuevo)
- **Método:** cada bloque (agrupado por regla) se comparó con el código fuente real para decidir si el aviso es correcto.

## Criterio

| Decisión | Significado | Estado en SonarQube |
|---|---|---|
| **Verdadero positivo** | El problema existe en el código y hay que corregirlo. | Se deja *Open* |
| **Falso positivo** | La regla se equivoca: el código ya cumple lo que la regla busca proteger. | *False positive* |
| **Aceptado** | El problema existe, pero es una decisión de diseño consciente. | *Accepted* (requiere confirmación del equipo) |

## Resumen

| Bloque | Regla | Issues | Falsos positivos | Verdaderos | Aceptables |
|---|---|---|---|---|---|
| 1 | `Web:InputWithoutLabelCheck` — campo sin label | 55 | 2 | 53 | 0 |
| 2 | `Web:S6853` — label no asociado a un control | 24 | 0 | 24 | 0 |
| 3 | `Web:S9379` — atributo `autofocus` | 3 | 0 | 0 | 3 |
| 4 | `typescript:S7655` — falta `implements OnInit` | 3 | 0 | 3 | 0 |
| 5 | `typescript:S7773` — `isNaN` / `isFinite` globales | 3 | 0 | 3 | 0 |
| 6 | `css:S4657` — shorthand pisa una propiedad | 1 | 0 | 1 | 0 |
| | **Total** | **89** | **2** | **84** | **3** |

**Conclusión:** casi todos los avisos son correctos. Solo 2 son falsos positivos. Los 3 de `autofocus` son una decisión de usabilidad del POS y se proponen como *Aceptados*.

---

## Bloque 1 — `Web:InputWithoutLabelCheck` (55)

**Qué pide la regla:** todo `<input>`, `<select>` o `<textarea>` debe tener un nombre accesible (normalmente un `<label for="...">` enlazado por `id`), para que un lector de pantalla pueda anunciar qué es el campo.

### Falsos positivos (2)

| Issue | Archivo | Línea | Motivo |
|---|---|---|---|
| `AaGdI2z5weoaoT78uELB` | `pages/catalog/catalog.component.html` | 27 | El `<select>` tiene `title="Area a la que salen sus comandas"`. Según el cálculo de nombre accesible (HTML-AAM / WAI-ARIA), `title` da nombre al control cuando no hay label, y los lectores de pantalla lo anuncian. |
| `AaGdI2z5weoaoT78uELI` | `pages/catalog/catalog.component.html` | 146 | El `<input type="number">` tiene `title="Cuanto suma o resta al precio"`. Mismo motivo. |

> Nota: es un falso positivo en sentido estricto, porque el control sí tiene nombre accesible. Aun así, un `<label>` visible es mejor práctica que `title`.

### Verdaderos positivos (53)

El campo no tiene ningún nombre accesible. En la mayoría hay un `<label>` al lado, pero sin `for`/`id`, así que no está enlazado. En otros solo hay `placeholder`, que **no** sustituye a un label: desaparece al escribir y WCAG 3.3.2 no lo acepta.

| Archivo | Líneas | Patrón |
|---|---|---|
| `pages/client/client.component.html` | 10, 13, 14, 15, 22, 28, 58, 61, 63, 64, 65 | Solo `placeholder` o nada (edición en tabla) |
| `pages/catalog/catalog.component.html` | 45, 46, 89, 110, 111, 145, 166, 167 | Solo `placeholder` o nada |
| `pages/shared/client-modal/client-modal.component.html` | 20, 93, 99, 109, 119 | `<label>` sin `for` / búsqueda sin label |
| `pages/payment/payment-edit/payment-edit.component.html` | 6, 10, 14, 18, 25 | `<label>` sin `for` |
| `pages/ingredient/ingredient-edit/ingredient-edit.component.html` | 6, 10, 14, 18 | `<label>` sin `for` |
| `pages/menu/menu-edit/menu-edit.component.html` | 6, 10, 14, 18 | `<label>` sin `for` |
| `pages/salon/table-order/checkout-modal/checkout-modal.component.html` | 38, 41, 92, 97 | `<label>` sin `for` / sin label |
| `pages/payment-method/payment-method-edit/payment-method-edit.component.html` | 6, 10 | `<label>` sin `for` |
| `pages/role/role-edit/role-edit.component.html` | 6, 10 | `<label>` sin `for` |
| `pages/table-layout/table-layout.component.html` | 109, 110 | Solo `placeholder` o nada |
| `pages/delivery/delivery.component.html` | 45, 348 | Solo `placeholder` / `<span>` en lugar de label |
| `pages/product/product.component.html` | 20, 59 | Tiene `id` pero ningún label lo usa / sin label |
| `pages/quick-sale/quick-sale.component.html` | 272 | Búsqueda solo con `placeholder` |
| `pages/salon/table-order/table-order.component.html` | 363 | Búsqueda solo con `placeholder` |

**Cómo corregir:** `<label for="x">…</label><input id="x">`. Para campos sin texto visible (búsquedas, edición en tabla), usar `aria-label="…"`.

## Bloque 2 — `Web:S6853` (24)

**Qué pide la regla:** cada `<label>` debe estar asociado a un control (con `for` o envolviéndolo) y tener texto.

**Todos son verdaderos positivos.** Son la otra cara del bloque 1: los mismos `<label>Texto:</label>` sin `for`. Al añadir `for`/`id` se cierran los dos issues a la vez.

| Archivo | Líneas |
|---|---|
| `pages/payment/payment-edit/payment-edit.component.html` | 5, 9, 13, 17, 24 |
| `pages/shared/client-modal/client-modal.component.html` | 92, 98, 108, 118 |
| `pages/ingredient/ingredient-edit/ingredient-edit.component.html` | 5, 9, 13, 17 |
| `pages/menu/menu-edit/menu-edit.component.html` | 5, 9, 13, 17 |
| `pages/payment-method/payment-method-edit/payment-method-edit.component.html` | 5, 9 |
| `pages/role/role-edit/role-edit.component.html` | 5, 9 |
| `pages/salon/table-order/checkout-modal/checkout-modal.component.html` | 91, 96 |
| `pages/salon/table-order/table-order.component.html` | 50 |

`table-order.component.html:50` se revisó en detalle: el `<label class="pos-switch">` envuelve el checkbox, pero solo contiene un `<span>` decorativo. El texto "Por posición" está **fuera** del label, así que el switch no tiene nombre accesible. Es verdadero positivo.

## Bloque 3 — `Web:S9379` `autofocus` (3) → propuesto como *Aceptado*

| Issue | Archivo | Línea |
|---|---|---|
| `AaGdI20AweoaoT78uELV` | `pages/quick-sale/quick-sale.component.html` | 272 |
| `AaGdI2z1weoaoT78uEK-` | `pages/salon/table-order/table-order.component.html` | 363 |
| `AaGdI20EweoaoT78uELf` | `pages/shared/client-modal/client-modal.component.html` | 20 |

El aviso es técnicamente correcto: `autofocus` mueve el foco sin avisar. Pero en estas tres pantallas (venta rápida, pedido de mesa y búsqueda de cliente) el cajero abre la vista justamente para escribir en el buscador, así que es una decisión de usabilidad del POS. **No es un falso positivo**; si el equipo lo confirma, se marca como *Accepted*.

## Bloque 4 — `typescript:S7655` falta `implements OnInit` (3)

| Archivo | Línea |
|---|---|
| `login/login.component.ts` | 36 |
| `login/reset-password/reset-password.component.ts` | 31 |
| `pages/layout/layout.component.ts` | 132 |

**Verdaderos positivos.** Las clases definen `ngOnInit()` pero no declaran `implements OnInit`. Funciona igual, pero la guía de estilo de Angular lo pide para que el compilador detecte errores de nombre. Corrección: `export class X implements OnInit`.

## Bloque 5 — `typescript:S7773` `isNaN` / `isFinite` globales (3)

| Archivo | Línea | Código |
|---|---|---|
| `pages/salon/salon.component.ts` | 147 | `isNaN(new Date(from).getTime())` |
| `pages/kitchen/kitchen.component.ts` | 90 | `isNaN(new Date(item.sentAt).getTime())` |
| `pages/product/product.component.ts` | 173 | `isFinite(Number(raw))` |

**Verdaderos positivos.** En los tres casos el valor ya es `number`, así que cambiar a `Number.isNaN` / `Number.isFinite` no altera el comportamiento y evita la conversión implícita de las versiones globales.

## Bloque 6 — `css:S4657` (1)

| Archivo | Línea |
|---|---|
| `pages/kitchen/kitchen.component.css` | 40 |

**Verdadero positivo, y es un bug visual real.** En `.ticket-card.late` se declara `border-left-color: #c62828` (rojo de "atrasado") y justo después `border-color: #f0c9c9`. El shorthand pisa el borde izquierdo, así que **la comanda atrasada pierde su franja roja**. Corrección: poner `border-color` antes de `border-left-color`.

---

## Acciones realizadas en SonarQube

| Issue | Estado aplicado | Comentario |
|---|---|---|
| `AaGdI2z5weoaoT78uELB` | *False positive* | El select tiene `title`, que le da nombre accesible |
| `AaGdI2z5weoaoT78uELI` | *False positive* | El input tiene `title`, que le da nombre accesible |

Además, a esos dos campos se les añadió `aria-label` (el mismo texto del `title`). Así la regla queda satisfecha también en código y, en el próximo análisis, SonarQube los cerrará como corregidos.

---

## Correcciones aplicadas en el código

Cada bloque se corrigió en su propio commit sobre `master`:

| Bloque | Commit | Cambio |
|---|---|---|
| 4 — `implements OnInit` | `920b787` | `LoginComponent`, `ResetPasswordComponent` y `LayoutComponent` declaran `implements OnInit`. |
| 5 — `Number.isNaN` / `Number.isFinite` | `6a69a59` | `salon.component.ts`, `kitchen.component.ts` y `product.component.ts`. Sin cambio de comportamiento (los valores ya eran `number`). |
| 6 — CSS | `9c1b72f` | En `.ticket-card.late`, `border-color` se movió antes de `border-left-color`: la comanda atrasada vuelve a mostrar su franja roja. |
| 1 y 2 — labels | `4788fba` | Ver el detalle abajo. |

**Detalle de los bloques 1 y 2:**

- **Formularios con label visible** (ingredient, menu, payment, payment-method, role, client-modal, checkout-modal): `<label for="…">` + `id` en el control. Los ids llevan prefijo por pantalla (`menu-name`, `payment-amount`…) para no chocar entre componentes.
- **Campos sin texto visible** (búsquedas, edición en tabla de clientes, catálogo, delivery, mesas, precio de productos, líneas de pago): `aria-label` con el nombre del campo. Es la alternativa que la propia regla acepta cuando no hay un label visible.
- **Switch "Por posición"** (`table-order.component.html`): dentro del `<label>` se añadió `<span class="sr-only">Por posición</span>`. Es un texto invisible en pantalla que sí leen los lectores de pantalla. La clase `.sr-only` se agregó en `src/styles.css`.

Se verificó con `ng build` (compila sin errores).

### Pendiente

- **Bloque 3 (`autofocus`, 3 issues):** no se tocó. Queda pendiente decidir si se marcan como *Accepted* o si se quita `autofocus`.
- **Verificación en SonarQube:** los issues se cerrarán cuando se haga push y SonarQube vuelva a analizar `master`.
