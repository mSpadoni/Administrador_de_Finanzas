# Dependency Inversion Principle (DIP)

## Rule

High-level modules **must not** depend on low-level modules. Both **must** depend on abstractions. Abstractions **must not** depend on details. Details **must** depend on abstractions.

## Scope

**All languages** - This principle applies universally to modular programming and dependency management.

## When to Apply

- Designing class dependencies and module boundaries
- Improving testability and mockability
- Decoupling business logic from infrastructure
- Building layered architectures
- Creating pluggable, swappable components
- When you need to change implementations without affecting clients

## Benefits

1. **Loose Coupling**: High-level logic independent of implementation details
2. **Easy Testing**: Can mock dependencies with test doubles
3. **Flexibility**: Swap implementations without changing high-level code
4. **Maintainability**: Changes to details don't affect business logic
5. **Reusability**: High-level modules can work with different implementations
6. **Parallel Development**: Teams can work on abstractions and implementations separately

## How to Apply

1. **Define Interfaces**: Create abstractions for dependencies
2. **Inject Dependencies**: Pass dependencies through constructor or parameters
3. **Depend on Abstractions**: Use interface types, not concrete classes
4. **Invert Control**: Let external code provide implementations
5. **Use Dependency Injection**: Framework or manual injection of dependencies

## Checklist

- [ ] High-level modules depend on interfaces, not concrete classes
- [ ] Low-level modules implement interfaces defined by high-level needs
- [ ] Dependencies flow toward abstractions
- [ ] Easy to swap implementations for testing or different environments
- [ ] No direct instantiation of dependencies inside classes
- [ ] Constructor or method parameters use interface types

## Common Violations

- ❌ Direct instantiation of concrete classes (e.g., `new PostgresRepository()`)
- ❌ Depending on implementation-specific methods
- ❌ Tight coupling to frameworks or libraries
- ❌ Using concrete types in method signatures
- ❌ Hard-coded dependencies that can't be changed
- ❌ Business logic knowing about database, file system, or network details

## See Examples

See examples in [examples/solid-dip-example.md](../pseudo-examples/solid-dip-example.md)
