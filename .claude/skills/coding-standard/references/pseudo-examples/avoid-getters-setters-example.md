# Avoid Getters/Setters - Pseudo-Code Example

## Correct Implementation

Direct access to properties:

```pseudo
// Plain interface with readonly properties
interface User {
  readonly name
  readonly email
}

// Direct property access
function getUserEmail(user) {
  return user.email
}

// Return new object for updates (immutability)
function updateUserEmail(user, email) {
  return {...user, email: email}
}

// Validation in constructor/factory
function createUser(name, email) {
  if (!email contains "@") {
    throw Error("Invalid email")
  }

  return {name: name, email: email}
}
```

## Incorrect Implementation

Using getters/setters with side effects:

```pseudo
// Getters/setters with side effects
class User {
  private email
  private accessCount = 0

  function getEmail() {
    accessCount = accessCount + 1  // Unexpected side effect
    logAccess()  // Hidden side effect
    return email
  }

  function setEmail(value) {
    validateEmail(value)  // Side effect
    notifyChange()  // Side effect
    email = value
  }

  private function logAccess() {
    log("Email accessed")
  }

  private function validateEmail(email) {
    if (!email contains "@") {
      throw Error("Invalid email")
    }
  }

  private function notifyChange() {
    // Notification logic
  }
}
```

## Why the Incorrect Version is Bad

1. **Hidden Side Effects**: Getters/setters hide unexpected behavior
2. **Unpredictable**: Property access has side effects
3. **Hard to Debug**: Must track all property accesses
4. **Breaks Expectations**: Property access should be simple and fast
5. **Poor Performance**: Side effects in getters can be expensive

## Checklist

- [ ] Use readonly properties for simple data access
- [ ] Avoid getters/setters with side effects
- [ ] Validation belongs in constructors or factory functions
- [ ] Updates create new objects (immutability)
- [ ] Keep property access simple and predictable

## Key Takeaways

- Use readonly properties for simple data access
- Avoid getters/setters with side effects
- Validation belongs in constructors or factory functions
- Updates create new objects (immutability)
- Keep property access simple and predictable
