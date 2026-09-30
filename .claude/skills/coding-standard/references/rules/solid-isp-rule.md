# Interface Segregation Principle (ISP)

## Rule

Clients **must not** be forced to depend on interfaces they do not use. Create small, focused interfaces over large, monolithic ones.

## Scope

**All languages** - This principle applies universally to languages with interfaces or abstract classes.

## When to Apply

- Designing interfaces or abstract classes
- When different clients need different subsets of functionality
- Building modular systems with varying capabilities
- Creating read-only, write-only, or specialized data access patterns
- Avoiding fat interfaces that force unnecessary dependencies

## Benefits

1. **Reduced Coupling**: Clients depend only on methods they actually use
2. **Easier Implementation**: Classes implement only relevant functionality
3. **Better Testability**: Mock only what's needed for each test
4. **Clearer Intent**: Small interfaces clearly communicate purpose
5. **Flexibility**: Mix and match interface implementations as needed
6. **No Dead Code**: Eliminates not-implemented or empty method stubs

## How to Apply

1. **Identify Client Needs**: Understand what each client actually uses
2. **Segregate Responsibilities**: Split large interfaces into focused ones
3. **Compose Interfaces**: Classes can implement multiple small interfaces
4. **Role-Based Interfaces**: Create interfaces based on roles (Readable, Writable, etc.)
5. **Avoid Fat Interfaces**: If an interface has many methods, it's probably too broad

## Checklist

- [ ] Interfaces have focused responsibilities
- [ ] Clients depend only on methods they use
- [ ] No empty or not-implemented methods in concrete classes
- [ ] Interface names clearly indicate their purpose
- [ ] Classes can implement multiple interfaces if needed
- [ ] No interface has more than 5-7 methods (rough guideline)

## Common Violations

- ❌ Fat interfaces with many unrelated methods
- ❌ Forcing implementations to have methods they don't need
- ❌ Empty method implementations or throwing NotImplementedException
- ❌ One giant interface for all CRUD operations
- ❌ Clients importing interfaces with methods they never call

## See Examples

See examples in [examples/solid-isp-example.md](../pseudo-examples/solid-isp-example.md)
