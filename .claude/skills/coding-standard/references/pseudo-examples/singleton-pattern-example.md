# Singleton Pattern - Pseudo-Code Example

## Correct Implementation

Singleton with lazy initialization:

```pseudo
class DatabaseConnection {
  private static instance

  // Private constructor prevents direct instantiation
  private constructor() {
    connection = createConnection()
  }

  public static function getInstance() {
    if (!instance) {
      instance = new DatabaseConnection()
    }
    return instance
  }

  private function createConnection() {
    return { /* connection logic */ }
  }

  public function query(sql) {
    return connection.execute(sql)
  }

  public function close() {
    connection.close()
  }
}

// Usage
db1 = DatabaseConnection.getInstance()
db2 = DatabaseConnection.getInstance()
// db1 === db2 (same instance)
```

## Incorrect Implementation

Public constructor allows multiple instances:

```pseudo
// Constructor is public - defeats singleton purpose
class DatabaseConnection {
  private static instance

  // Public constructor allows: new DatabaseConnection()
  public constructor() {
    connection = createConnection()
  }

  public static function getInstance() {
    if (!instance) {
      instance = new DatabaseConnection()
    }
    return instance
  }
}

// Can create multiple instances
db1 = new DatabaseConnection()  // Allowed!
db2 = new DatabaseConnection()  // Different instance!
db3 = DatabaseConnection.getInstance()  // Yet another!
```

## Why the Incorrect Version is Bad

1. **Public Constructor**: Allows creating instances directly, defeating the singleton purpose
2. **No Instance Control**: Multiple instances can exist simultaneously
3. **Resource Waste**: Creates duplicate expensive resources
4. **State Inconsistency**: Different instances may have different states
5. **Violates Contract**: Doesn't guarantee single instance

## Checklist

- [ ] Constructor is private
- [ ] Provides static getInstance() method
- [ ] Lazy initialization implemented
- [ ] Thread-safe if needed in concurrent environment

## Key Takeaways

- Always make constructor private
- Provide a static getInstance() method
- Ensure lazy initialization
- Consider thread safety in multi-threaded environments
- Use singleton for truly shared resources, not as a global variable replacement
