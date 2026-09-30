# Avoid Module Side Effects - Pseudo-Code Example

## Correct Implementation

Module exports pure functions and constants:

```pseudo
// Pure constants
MAX_RETRIES = 3
API_VERSION = "v1"

// Pure functions
function calculateTax(amount, rate) {
  return amount * rate
}

function validateEmail(email) {
  return email contains "@"
}

// Factory functions for initialization
function createApiClient(config) {
  return {
    function fetch(endpoint) {
      // Use config
    }
  }
}

// Classes that must be instantiated
class Logger {
  function log(message) {
    print(message)
  }
}
```

## Incorrect Implementation

Module executes code on import:

```pseudo
// Side effects during module load
print("Module loaded")  // Side effect on import

// Global mutable state initialized
globalState = {user: null, isLoaded: false}

// Starts background tasks on import
startBackgroundSync()  // Side effect

// Makes network requests on import
config = await fetchConfig()  // Side effect

// Modifies DOM on import
document.title = "App Loaded"  // Side effect
```

## Why the Incorrect Version is Bad

1. **Import Order Matters**: Side effects depend on when module is imported
2. **Hard to Test**: Tests must deal with side effects during import
3. **Unpredictable**: Module behavior changes based on context
4. **Tight Coupling**: Module affects global state
5. **Performance Issues**: Work done even if not needed

## Checklist

- [ ] Module exports only functions and constants
- [ ] No code executes on import
- [ ] No global state modifications
- [ ] Initialization requires explicit function call
- [ ] Side effects are isolated to functions

## Key Takeaways

- Module imports should have no side effects
- Export pure functions and constants
- Require explicit initialization for side effects
- Keep modules predictable and testable
- Side effects belong in functions, not at module level
