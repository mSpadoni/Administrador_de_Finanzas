# Single Level of Abstraction - Pseudo-Code Example

## Correct Implementation

Consistent abstraction level:

```pseudo
// Same level of abstraction
function processOrder(orderId) {
  order = fetchOrder(orderId)
  validateOrder(order)
  chargeCustomer(order)
  sendConfirmation(order)
}

function fetchOrder(orderId) {
  return database.query("SELECT * FROM orders WHERE id = ?", [orderId])
}

function validateOrder(order) {
  if (!order.items OR order.items.length == 0) {
    throw Error("Invalid order")
  }
}

function chargeCustomer(order) {
  paymentService.charge(order.total)
}

function sendConfirmation(order) {
  html = buildConfirmationEmail(order)
  emailService.send(order.customerEmail, html)
}

function buildConfirmationEmail(order) {
  return "<html><body>Order confirmed</body></html>"
}
```

## Incorrect Implementation

Mixed levels of abstraction:

```pseudo
// Mixed levels of abstraction
function processOrder(orderId) {
  // Low-level database query mixed with high-level logic
  order = db.query("SELECT * FROM orders WHERE id = ?", [orderId])

  // High-level validation
  if (!order.items OR order.items.length == 0) {
    throw Error("Invalid order")
  }

  // High-level business operation
  chargeCustomer(order)

  // Low-level HTML string construction
  html = "<html><body>Order confirmed</body></html>"
  emailService.send(order.customerEmail, html)
}
```

## Why the Incorrect Version is Bad

1. **Hard to Read**: Mixing abstraction levels is confusing
2. **Unclear Intent**: Cannot see high-level flow
3. **Poor Maintainability**: Low-level details obscure logic
4. **Hard to Test**: Cannot test high-level logic separately
5. **Difficult to Modify**: Changes to low-level details affect main function

## Checklist

- [ ] All operations in a function are at same abstraction level
- [ ] Extract low-level details into separate functions
- [ ] High-level functions read like step-by-step instructions
- [ ] Don't mix database queries with business logic
- [ ] Don't mix string formatting with domain operations

## Key Takeaways

- All operations in a function must be at same abstraction level
- Extract low-level details into separate functions
- High-level functions read like step-by-step instructions
- Don't mix database queries with business logic
- Don't mix string formatting with domain operations
- Consistent abstraction makes code easier to understand
