# Repository Pattern - Pseudo-Code Example

## Correct Implementation

Repository pattern abstracting data access:

```pseudo
// Repository interface
interface UserRepository {
  function findById(userId)
  function findAll()
  function save(user)
  function delete(userId)
}

// Database implementation
class DatabaseUserRepository implements UserRepository {
  database

  constructor(database) {
    this.database = database
  }

  function findById(userId) {
    result = database.query("SELECT * FROM users WHERE id = ?", userId)
    return result ? User.fromDict(result) : null
  }

  function findAll() {
    results = database.query("SELECT * FROM users")
    return results.map(r => User.fromDict(r))
  }

  function save(user) {
    database.execute("INSERT INTO users (...) VALUES (...)", user.toDict())
    return user
  }

  function delete(userId) {
    return database.execute("DELETE FROM users WHERE id = ?", userId)
  }
}

// In-memory implementation for testing
class InMemoryUserRepository implements UserRepository {
  users = {}
  nextId = 1

  function findById(userId) {
    return users[userId] or null
  }

  function findAll() {
    return values of users
  }

  function save(user) {
    if (!user.id) {
      user.id = nextId
      nextId = nextId + 1
    }
    users[user.id] = user
    return user
  }

  function delete(userId) {
    if (userId in users) {
      remove users[userId]
      return true
    }
    return false
  }
}

// Usage in service layer
class UserService {
  userRepository

  constructor(userRepository) {
    this.userRepository = userRepository
  }

  function createUser(email, name) {
    user = new User(email, name)
    return userRepository.save(user)
  }

  function getActiveUsers() {
    return userRepository.findAll().filter(u => u.isActive)
  }
}
```

## Incorrect Implementation

Direct database access in business logic:

```pseudo
// Business logic coupled to database
class UserService {
  database

  constructor(database) {
    this.database = database
  }

  function createUser(email, name) {
    // SQL queries in business logic
    existing = database.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    )
    if (existing) {
      throw Error("User exists")
    }

    // Direct database access
    result = database.query(
      "INSERT INTO users (email, name) VALUES (?, ?) RETURNING id",
      [email, name]
    )
    return result
  }

  function getActiveUsers() {
    // SQL in business logic
    return database.query(
      "SELECT * FROM users WHERE is_active = TRUE"
    )
  }

  function deactivateUser(userId) {
    // SQL in business logic
    return database.execute(
      "UPDATE users SET is_active = FALSE WHERE id = ?",
      [userId]
    )
  }
}
```

## Why the Incorrect Version is Bad

1. **Tight Coupling**: Business logic directly depends on database
2. **Hard to Test**: Cannot easily mock database for unit tests
3. **No Abstraction**: SQL queries scattered throughout business logic
4. **Violates SRP**: Service handles both business logic and data access
5. **Inflexible**: Changing database requires modifying all services
6. **Code Duplication**: Same queries repeated in multiple places
7. **Difficult Maintenance**: Data access logic spread across codebase

## Checklist

- [ ] Abstract data access behind repository interface
- [ ] Business logic depends on interface, not implementation
- [ ] Repository provides collection-like methods
- [ ] Can create in-memory repository for testing

## Key Takeaways

- Abstract data access behind repository interface
- Business logic depends on interface, not implementation
- Repository provides collection-like methods (find, save, delete)
- Easy to create in-memory repository for testing
- Centralize data access logic in repository
- Domain entities are independent of database schema
- Can switch data sources without changing business logic
- Promotes testability and maintainability
