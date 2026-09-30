# Meaningful Names - Pseudo-Code Example

## Correct Implementation

Self-documenting names:

```pseudo
// Self-documenting code
class UserService {
  function isActiveAndNotDeleted(user) {
    return user.isActive AND !user.isDeleted
  }

  function getUsersByRegistrationDate(startDate, endDate) {
    return repository.findByDateRange(startDate, endDate)
  }

  // Comments explain WHY
  function processPayment(amount) {
    // Stripe requires amount in cents, not dollars
    amountInCents = amount * 100
    stripe.charge(amountInCents)
  }
}

// Boolean naming
function isValidEmail(email) {
  return email contains "@"
}

function hasActiveSubscription(user) {
  return user.subscription.status == "active"
}

function canAccessPremiumFeatures(user) {
  return user.isPremium OR user.role == "admin"
}
```

## Incorrect Implementation

Unclear, abbreviated names:

```pseudo
// Comments explaining WHAT
class UserService {
  // Check if user is active and not deleted
  function isValid(u) {
    return u.a AND !u.d
  }

  // Get users between two dates
  function getUsr(d1, d2) {
    return repo.fnd(d1, d2)
  }

  // Process payment
  function proc(amt) {
    a = amt * 100  // Convert to cents
    str.chrg(a)
  }
}

// Unclear boolean names
function validate(e) {
  return e contains "@"
}

function check(u) {
  return u.s.st == "active"
}
```

## Why the Incorrect Version is Bad

1. **Hard to Understand**: Abbreviations obscure meaning
2. **Requires Comments**: Need comments to explain WHAT code does
3. **Poor Maintainability**: Future developers must decode abbreviations
4. **Error Prone**: Easy to confuse similar abbreviations
5. **Wastes Time**: Reading and understanding takes longer

## Checklist

- [ ] Use descriptive, self-documenting names
- [ ] Boolean functions start with is/has/can
- [ ] Avoid abbreviations unless universally understood
- [ ] Comments explain WHY, not WHAT
- [ ] Names clearly convey intent

## Key Takeaways

- Use descriptive, self-documenting names
- Boolean functions start with is/has/can
- Avoid abbreviations unless universally understood
- Comments explain WHY, not WHAT
- Names must clearly convey intent
- Code should be self-documenting
