# Avoid Side Effects - Pseudo-Code Example

## Correct Implementation

Functions without side effects:

```pseudo
// Pure function, no side effects
function calculateDiscount(price, discountRate) {
  return price * (1 - discountRate)
}

function processOrder(order) {
  discount = calculateDiscount(order.total, 0.1)
  finalPrice = order.total - discount

  return {
    ...order,
    discount: discount,
    finalPrice: finalPrice
  }
}

// State passed as parameter and returned
function updateUserEmail(user, email) {
  return {...user, email: email}
}

function addItemToCart(cart, item) {
  return {
    ...cart,
    items: [...cart.items, item]
  }
}
```

## Incorrect Implementation

Functions with side effects:

```pseudo
// Modifies external state
appliedDiscount = 0

function calculateDiscount(price, rate) {
  appliedDiscount = price * rate  // Side effect
  return price * (1 - rate)
}

// Modifies input parameter
function addItemToCart(cart, item) {
  cart.items.push(item)  // Mutates input
}

// Hidden side effects
requestCount = 0

function makeApiRequest(url) {
  requestCount = requestCount + 1  // Side effect
  return fetch(url)
}
```

## Why the Incorrect Version is Bad

1. **Unpredictable**: Output can vary even with same inputs
2. **Hard to Test**: Requires mocking external dependencies and state
3. **Not Reusable**: Cannot safely use in different contexts
4. **Race Conditions**: Shared mutable state can cause bugs in concurrent code
5. **Difficult to Debug**: Must track state changes across the entire application

## Checklist

- [ ] Functions don't modify external variables
- [ ] Pass state as parameters and return new state
- [ ] Make side effects explicit (I/O operations)
- [ ] Isolate impure operations to system boundaries

## Key Takeaways

- Functions must not modify external variables
- Pass state as parameters and return new state
- Make side effects explicit (I/O operations)
- Isolate impure operations to system boundaries
- Pure functions are easier to test and reason about
