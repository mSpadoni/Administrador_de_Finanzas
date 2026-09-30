# Dependency Injection

## Rule

Invert control by injecting dependencies rather than creating them internally. Classes should receive their dependencies from external sources, not construct them.

## When to Apply

- When you want loose coupling between components
- When you need to make code testable
- When dependencies may vary or be replaced
- When following SOLID principles (especially Dependency Inversion)
- When building modular, maintainable systems
- When you want to avoid hard-coded dependencies
- When implementing Inversion of Control (IoC)

## Benefits

- **Testability**: Easy to inject mock dependencies for testing
- **Loose Coupling**: Classes don't depend on concrete implementations
- **Flexibility**: Easy to swap implementations
- **Maintainability**: Dependencies explicit and visible
- **Reusability**: Components can be reused with different dependencies
- **Single Responsibility**: Classes focus on their logic, not dependency creation
- **Configuration**: Dependencies configured externally

## How to Apply

1. **Identify Dependencies**: Determine what external resources a class needs
2. **Define Interfaces**: Create interfaces for dependencies
3. **Constructor Injection**: Pass dependencies through constructor (preferred)
4. **Property Injection**: Set dependencies via properties (when needed)
5. **Dependency Inversion**: Depend on abstractions, not concretions

## Injection Types

### Constructor Injection (Preferred)

- Dependencies required for object to function
- Makes dependencies explicit and mandatory
- Enables immutability

### Property/Setter Injection

- Optional dependencies
- Dependencies that can change after construction
- Less preferred, makes dependencies less obvious

### Method Injection

- Dependencies needed only for specific method
- Temporary or contextual dependencies

## Checklist

- [ ] Dependencies injected, not created internally
- [ ] Classes depend on interfaces, not concrete implementations
- [ ] Constructor injection used for required dependencies
- [ ] Dependencies are explicit and visible
- [ ] Easy to substitute mock objects for testing
- [ ] No use of `new` keyword for dependencies in class
- [ ] Follows Dependency Inversion Principle

## Common Use Cases

| Use Case          | Example                                     |
| ----------------- | ------------------------------------------- |
| **Service Layer** | Inject repositories and other services      |
| **Controllers**   | Inject services and validators              |
| **Testing**       | Inject mock dependencies                    |
| **Configuration** | Inject configuration objects                |
| **Logging**       | Inject logger instances                     |
| **Data Access**   | Inject database connections or repositories |

## Comparison

| Approach            | Testability | Coupling | Flexibility |
| ------------------- | ----------- | -------- | ----------- |
| **DI**              | High        | Low      | High        |
| **Hard-coded**      | Low         | High     | Low         |
| **Service Locator** | Medium      | Medium   | Medium      |

## Cautions

- Don't overuse - simple cases may not need DI
- Constructor with too many parameters indicates SRP violation
- Circular dependencies indicate design problems

## See Examples

See examples in [examples/dependency-injection-example.md](../pseudo-examples/dependency-injection-example.md)
