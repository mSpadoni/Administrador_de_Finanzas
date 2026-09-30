# Avoid Global Variables - Pseudo-Code Example

## Correct Implementation

Avoiding global mutable state:

```pseudo
// Configuration passed as parameter
function createApiClient(config) {
  return {
    function fetch(endpoint) {
      response = fetch(config.apiUrl + endpoint, {timeout: config.timeout})
      return response.json()
    }
  }
}

// Factory function for creating configured instances
function createConfig(env) {
  return {
    apiUrl: env == "prod" ? "https://api.prod.com" : "https://api.dev.com",
    timeout: 5000
  }
}

// State encapsulated in class
class AppState {
  private currentUser = null

  function setUser(user) {
    currentUser = user
  }

  function getUser() {
    return currentUser
  }
}

// Dependency injection
class UserService {
  database
  logger
  config

  constructor(database, logger, config) {
    this.database = database
    this.logger = logger
    this.config = config
  }

  function createUser(data) {
    logger.log("Creating user")
    user = database.save(data)
    return user
  }
}

// Global constants are fine (immutable)
MAX_RETRIES = 3
API_VERSION = "v1"
DEFAULT_TIMEOUT = 5000
```

## Incorrect Implementation

Using global mutable variables:

```pseudo
// Global mutable state
globalConfig = {}
currentUser = null
isAuthenticated = false

function setConfig(config) {
  globalConfig = config  // Modifying global state
}

function setCurrentUser(user) {
  currentUser = user  // Modifying global state
  isAuthenticated = true
}

function getApiUrl() {
  return globalConfig.apiUrl  // Depending on global state
}

// Module-level mutable state
requestCount = 0

function makeRequest() {
  requestCount = requestCount + 1  // Side effect on global variable
  // Make request...
}

function getRequestCount() {
  return requestCount
}

// Global cache
cache = {}

function getCached(key) {
  return cache[key]
}

function setCache(key, value) {
  cache[key] = value
}
```

## Why the Incorrect Version is Bad

1. **Hard to Test**: Tests must reset global state between runs
2. **Hidden Dependencies**: Functions have implicit dependencies
3. **Race Conditions**: Shared mutable state causes concurrency bugs
4. **Difficult to Reason**: Must track global state across entire application
5. **Poor Modularity**: Code cannot be used in different contexts

## Checklist

- [ ] No global mutable variables
- [ ] Configuration passed as parameters or injected
- [ ] State encapsulated in classes
- [ ] Functions receive dependencies as parameters
- [ ] Global constants (immutable) are acceptable

## Key Takeaways

- Avoid global mutable variables - they cause hidden dependencies and bugs
- Pass configuration and dependencies as parameters
- Encapsulate state in classes or closures
- Global constants (immutable values) are fine
- Code without globals is easier to test and reason about
