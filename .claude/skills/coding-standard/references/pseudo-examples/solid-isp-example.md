# Interface Segregation Principle (ISP) - Pseudo-Code Example

## Correct Implementation

Segregated interfaces allow classes to implement only what they need:

```pseudo
// Small, focused interfaces
interface Readable {
  function read(id) returns User
}

interface Writable {
  function create(user)
  function update(user)
}

interface Deletable {
  function delete(id)
}

// Repositories implement only what they need
class ReadOnlyUserRepository implements Readable {
  function read(id) {
    // Implementation
  }
}

class FullUserRepository implements Readable, Writable, Deletable {
  // Implements all operations
}

// Client depends only on what it needs
class UserDisplayService {
  repository  // Only needs Readable

  constructor(repository) {
    this.repository = repository
  }

  function displayUser(id) {
    user = repository.read(id)
    return user ? user.name : "Not found"
  }
}
```

## Incorrect Implementation

Fat interface forces all implementations to have all methods:

```pseudo
// Fat interface with too many methods
interface UserRepository {
  function read(id)
  function create(user)
  function update(user)
  function delete(id)
  function archive(id)
  function restore(id)
}

// Read-only implementation forced to implement methods it doesn't support
class ReadOnlyUserRepository implements UserRepository {
  function read(id) {
    // Only this makes sense
  }

  // Forced to implement methods that don't make sense
  function create(user) {
    throw Error("Not supported")
  }

  function update(user) {
    throw Error("Not supported")
  }

  function delete(id) {
    throw Error("Not supported")
  }

  function archive(id) {
    throw Error("Not supported")
  }

  function restore(id) {
    throw Error("Not supported")
  }
}
```

## Why the Incorrect Version is Bad

1. **Forced Dependencies**: Read-only clients depend on write methods they never use
2. **Not-Implemented Methods**: Classes must throw exceptions for unsupported methods
3. **Unclear Contracts**: Interface doesn't communicate what's actually supported
4. **Hard to Test**: Must mock all methods even when testing single method
5. **Tight Coupling**: Clients coupled to entire interface, not just what they need

## Checklist

- [ ] Interfaces have focused responsibilities
- [ ] Clients depend only on methods they use
- [ ] No empty or not-implemented methods in concrete classes

## Key Takeaways

- Split large interfaces into smaller, focused ones
- Classes implement only what they support
- No empty methods or "not implemented" exceptions
- Clients depend only on methods they use
- Compose multiple small interfaces rather than one large interface
