# Early Returns - Pseudo-Code Example

## Correct Implementation

Using early returns to reduce nesting:

```pseudo
// Early returns for validation
function processPayment(amount, balance) {
  if (amount <= 0) return false
  if (balance < amount) return false
  if (!isValidTransaction(amount)) return false

  deductBalance(amount)
  recordTransaction(amount)
  return true
}

// Guard clauses
function calculateDiscount(user, orderTotal) {
  if (!user) return 0
  if (orderTotal < 10) return 0
  if (!user.isActive) return 0

  if (user.isPremium) return orderTotal * 0.2
  if (user.totalOrders > 10) return orderTotal * 0.1

  return orderTotal * 0.05
}

// Null/undefined checks first
function getUserEmail(userId) {
  user = findUser(userId)
  if (!user) return null

  profile = user.profile
  if (!profile) return null

  return profile.email
}

// Handle errors early
function fetchUserData(userId) {
  if (!userId) {
    throw Error("User ID is required")
  }

  user = database.getUser(userId)
  if (!user) {
    throw Error("User not found")
  }

  if (!user.isActive) {
    throw Error("User is not active")
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email
  }
}
```

## Incorrect Implementation

Deep nesting without early returns:

```pseudo
// Deeply nested conditions
function processPayment(amount, balance) {
  if (amount > 0) {
    if (balance >= amount) {
      if (isValidTransaction(amount)) {
        deductBalance(amount)
        recordTransaction(amount)
        return true
      }
    }
  }
  return false
}

// No guard clauses
function calculateDiscount(user, orderTotal) {
  if (user) {
    if (orderTotal >= 10) {
      if (user.isActive) {
        if (user.isPremium) {
          return orderTotal * 0.2
        } else {
          if (user.totalOrders > 10) {
            return orderTotal * 0.1
          } else {
            return orderTotal * 0.05
          }
        }
      }
    }
  }
  return 0
}

// Nested null checks
function getUserEmail(userId) {
  user = findUser(userId)
  if (user) {
    profile = user.profile
    if (profile) {
      return profile.email
    }
  }
  return null
}

// Happy path buried deep
function fetchUserData(userId) {
  if (userId) {
    user = database.getUser(userId)
    if (user) {
      if (user.isActive) {
        return {
          id: user.id,
          name: user.name,
          email: user.email
        }
      } else {
        throw Error("User is not active")
      }
    } else {
      throw Error("User not found")
    }
  } else {
    throw Error("User ID is required")
  }
}
```

## Why the Incorrect Version is Bad

1. **Hard to Read**: Happy path is buried in nested conditions
2. **Difficult to Maintain**: Adding new validations requires more nesting
3. **Cognitive Load**: Must track multiple levels of indentation
4. **Error Prone**: Easy to miss edge cases in deeply nested code
5. **Poor Scalability**: Each new condition increases complexity

## Refactoring to Early Returns

```pseudo
// Before: Nested
function processOrder(order) {
  if (order) {
    if (order.items.length > 0) {
      if (order.total > 0) {
        if (order.customerId) {
          // Process order
          return "Order processed"
        } else {
          return "No customer"
        }
      } else {
        return "Invalid total"
      }
    } else {
      return "No items"
    }
  } else {
    return "No order"
  }
}

// After: Early returns
function processOrder(order) {
  if (!order) return "No order"
  if (order.items.length == 0) return "No items"
  if (order.total <= 0) return "Invalid total"
  if (!order.customerId) return "No customer"

  // Process order - happy path is clear
  return "Order processed"
}
```

## Checklist

- [ ] Validation and error cases return early
- [ ] Nesting level is minimal (1-2 levels max)
- [ ] Happy path is at the end, not buried in conditionals
- [ ] Guard clauses protect against invalid inputs
- [ ] Code reads naturally from top to bottom

## Key Takeaways

- Return early from functions to handle edge cases and validations
- Guard clauses reduce nesting and improve readability
- Happy path should be at the end of the function, not buried in nested conditionals
- Each early return should handle one specific edge case
- Flat code is easier to read and maintain than deeply nested code
