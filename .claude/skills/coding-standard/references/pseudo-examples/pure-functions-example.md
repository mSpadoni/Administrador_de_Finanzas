# Pure Functions - Pseudo-Code Example

## Correct Implementation

Pure functions that always produce the same output for the same input:

```pseudo
// Pure functions
function calculateTotal(items) {
  sum = 0
  for each item in items {
    sum = sum + item.price
  }
  return sum
}

function formatDate(date) {
  return date.toISOString()
}

function applyDiscount(price, discountRate) {
  return price * (1 - discountRate)
}

function getFullName(firstName, lastName) {
  return firstName + " " + lastName
}

function calculateShippingCost(weight, distance) {
  baseRate = 5.0
  weightRate = 0.5
  distanceRate = 0.1

  return baseRate + (weight * weightRate) + (distance * distanceRate)
}
```

## Incorrect Implementation

Impure functions that modify external state or depend on it:

```pseudo
// Modifies external state
total = 0
function addToTotal(item) {
  total = total + item.price  // Side effect: modifies global variable
}

// Depends on external mutable state
discountRate = 0.1
function applyDiscount(price) {
  return price * (1 - discountRate)  // Depends on mutable global
}

// Has side effects
function processUser(user) {
  print("Processing user")  // Side effect: logging
  saveToDatabase(user)  // Side effect: I/O operation
  return user
}

// Non-deterministic (different output for same input)
function generateId() {
  return random()  // Different result each time
}

function getCurrentUser() {
  return globalState.currentUser  // Depends on mutable state
}
```

## Why the Incorrect Version is Bad

1. **Unpredictable**: Output can vary even with same inputs
2. **Hard to Test**: Requires mocking external dependencies and state
3. **Not Reusable**: Cannot safely use in different contexts
4. **Race Conditions**: Shared mutable state can cause bugs in concurrent code
5. **Difficult to Debug**: Must track state changes across the entire application

## Refactoring Impure to Pure

```pseudo
// Before: Impure
total = 0
function addToTotal(item) {
  total = total + item.price
}

// After: Pure
function calculateTotal(items) {
  sum = 0
  for each item in items {
    sum = sum + item.price
  }
  return sum
}

// Before: Impure
discountRate = 0.1
function applyDiscount(price) {
  return price * (1 - discountRate)
}

// After: Pure
function applyDiscount(price, discountRate) {
  return price * (1 - discountRate)
}
```

## When Impure Functions Are Necessary

Some operations must be impure (I/O, randomness, time). Isolate these:

```pseudo
// Impure wrapper (clearly marked)
function saveUser(user) {
  database.save(user)  // I/O operation
}

// Pure logic extracted
function validateUser(user) {
  return {
    isValid: user.email contains "@" AND user.password.length >= 8,
    errors: []
  }
}

// Compose: pure logic with impure I/O at edges
function createUser(userData) {
  validation = validateUser(userData)  // Pure

  if (!validation.isValid) {
    throw Error("Invalid user")
  }

  user = buildUser(userData)  // Pure
  saveUser(user)  // Impure (isolated)
  return user
}
```

## Checklist

- [ ] Function always returns same output for same input
- [ ] No external state modifications
- [ ] No I/O operations (file, network, database)
- [ ] No logging or console output
- [ ] No dependencies on mutable global state

## Key Takeaways

- Pure functions are easier to test, debug, and reuse
- Extract pure logic from impure operations
- Pass dependencies as parameters instead of using globals
- Isolate impure operations (I/O, randomness) to the edges of your system
- Most business logic can and should be pure
