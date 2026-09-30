# Dependency Inversion Principle (DIP) - Pseudo-Code Example

## Correct Implementation

High-level code depends on abstractions, not concrete implementations:

```pseudo
// Define abstraction
interface UserRepository {
  function save(user)
  function findById(id) returns User or null
}

// High-level module depends on abstraction
class CreateUserUseCase {
  userRepository  // Depends on interface, not concrete class

  constructor(userRepository) {
    this.userRepository = userRepository
  }

  function execute(data) {
    user = new User(data)
    userRepository.save(user)
    return user
  }
}

// Low-level implementations
class PostgresUserRepository implements UserRepository {
  function save(user) {
    // PostgreSQL-specific implementation
  }

  function findById(id) {
    // PostgreSQL-specific implementation
  }
}

class InMemoryUserRepository implements UserRepository {
  users = {}

  function save(user) {
    users[user.id] = user
  }

  function findById(id) {
    return users[id] or null
  }
}
```

## Incorrect Implementation

High-level code depends on concrete implementation:

```pseudo
// High-level module depends on concrete class
class CreateUserUseCase {
  postgresUserRepository  // Tightly coupled to PostgreSQL

  constructor(postgresUserRepository) {
    this.postgresUserRepository = postgresUserRepository
  }

  function execute(data) {
    // Tightly coupled to PostgreSQL implementation
    user = new User(data)
    postgresUserRepository.insertIntoPostgres(user)
    return user
  }
}

// OR WORSE - creates dependency internally
class CreateUserUseCase {
  postgresUserRepository = new PostgresUserRepository()

  function execute(data) {
    // Hardcoded dependency - can't be changed or tested
  }
}
```

## Why the Incorrect Version is Bad

1. **Tight Coupling**: Business logic knows about PostgreSQL specifically
2. **Hard to Test**: Cannot easily mock or substitute the repository
3. **No Flexibility**: Cannot switch to different database without rewriting
4. **Violates DIP**: High-level module depends on low-level details
5. **Hard to Maintain**: Changes to database require changing business logic

## Checklist

- [ ] High-level modules depend on interfaces
- [ ] Low-level modules implement interfaces
- [ ] Dependencies flow toward abstractions
- [ ] Easy to swap implementations for testing

## Key Takeaways

- Depend on interfaces, not concrete classes
- Use constructor injection to provide dependencies
- High-level business logic should know nothing about implementation details
- Makes testing easy - swap real implementations with mocks
- Enables flexibility - change implementations without touching business logic
