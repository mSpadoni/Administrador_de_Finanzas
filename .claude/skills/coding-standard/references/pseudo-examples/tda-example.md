# TDA - Tell, Don't Ask - Pseudo-Code Example

## Correct Implementation

Tell objects what to do, encapsulate business logic:

```pseudo
// Tell the object what to do
class User {
  private isActive = true
  private failedLoginAttempts = 0

  function deactivate() {
    if (!isActive) {
      throw Error("User already inactive")
    }
    isActive = false
    logDeactivation()
  }

  function recordFailedLogin() {
    failedLoginAttempts = failedLoginAttempts + 1
    if (failedLoginAttempts >= 5) {
      lock()
    }
  }

  private function lock() {
    isActive = false
    logLockout()
  }

  private function logDeactivation() {
    log("User " + id + " deactivated")
  }

  private function logLockout() {
    log("User " + id + " locked due to failed login attempts")
  }
}

// Usage - Tell it what to do
user.deactivate()
user.recordFailedLogin()
```

## Incorrect Implementation

Ask for data and make decisions externally:

```pseudo
// Ask for data and make decisions externally
class User {
  function getIsActive() {
    return isActive
  }

  function setIsActive(value) {
    isActive = value
  }

  function getFailedLoginAttempts() {
    return failedLoginAttempts
  }

  function setFailedLoginAttempts(value) {
    failedLoginAttempts = value
  }
}

// Usage - Asking and deciding externally
if (user.getIsActive()) {
  user.setIsActive(false)
  log("User " + user.id + " deactivated")
}

if (user.getFailedLoginAttempts() >= 5) {
  user.setIsActive(false)
  log("User " + user.id + " locked")
}
```

## Why the Incorrect Version is Bad

1. **Broken Encapsulation**: Internal state exposed via getters/setters
2. **Logic Duplication**: Business rules repeated in every caller
3. **Inconsistency Risk**: Different callers might implement logic differently
4. **Hard to Maintain**: Must update all callers when business rules change
5. **Invalid State**: Setters allow invalid state transitions

## Checklist

- [ ] Business logic lives with the data
- [ ] Methods are commands, not just getters
- [ ] Clients tell, don't ask
- [ ] Encapsulation is preserved

## Key Takeaways

- Encapsulate business logic with the data
- Use command methods instead of getters/setters
- Object should control its own state transitions
- Prevents logic duplication across callers
- **Exception**: DTOs and value objects don't need behavior
