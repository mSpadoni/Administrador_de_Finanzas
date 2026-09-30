# Singleton Pattern

## Rule

Ensure a class has only one instance and provide a global point of access to it.

## When to Apply

- When exactly one instance of a class is needed across the system
- Managing shared resources (database connections, configuration managers, logging services)
- When the single instance should be lazy-initialized
- When you need controlled access to a sole instance
- Coordinating actions across the system

## Benefits

- **Controlled Instance**: Guarantees only one instance exists
- **Global Access**: Provides a well-defined access point
- **Lazy Initialization**: Instance created only when first needed
- **Resource Management**: Efficient for expensive resources like database connections
- **Thread Safety**: Can be implemented with thread-safe initialization

## How to Apply

1. **Private Constructor**: Make the constructor private to prevent direct instantiation
2. **Static Instance**: Hold the instance as a static member
3. **Static Accessor**: Provide a public static method to get the instance
4. **Lazy Creation**: Create the instance only when first requested
5. **Thread Safety**: Ensure thread-safe initialization in multi-threaded environments

## Checklist

- [ ] Constructor is private (cannot create instances externally)
- [ ] Static instance variable holds the single instance
- [ ] Public static method provides access to the instance
- [ ] Lazy initialization implemented correctly
- [ ] Thread-safe in multi-threaded environments
- [ ] Copy constructor and assignment operator deleted (C++) or prevented

## Common Use Cases

| Use Case                | Example                           |
| ----------------------- | --------------------------------- |
| **Database Connection** | Single connection pool manager    |
| **Configuration**       | Application-wide settings manager |
| **Logging**             | Centralized logging service       |
| **Cache**               | Shared cache instance             |
| **Thread Pool**         | Global thread pool manager        |

## Cautions

- Can make unit testing difficult (global state)
- May hide dependencies in the code
- Can become an anti-pattern if overused
- Consider dependency injection as an alternative
- Be careful with multi-threading

## See Examples

See examples in [examples/singleton-pattern-example.md](../pseudo-examples/singleton-pattern-example.md)
