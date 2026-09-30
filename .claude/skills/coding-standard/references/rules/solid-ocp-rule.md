# Open/Closed Principle (OCP)

## Rule

Software entities (classes, modules, functions) **must** be open for extension but closed for modification.

## Scope

**All languages** - This principle applies universally to object-oriented and modular programming.

## When to Apply

- Building extensible systems that need to accommodate new features
- Adding new features without breaking existing code
- Designing plugin architectures or modular systems
- When you anticipate multiple variations of behavior
- Working with systems where changing existing code is risky or costly

## Benefits

1. **Reduced Risk**: Existing code remains untouched, reducing bugs
2. **Easier Maintenance**: New features don't require understanding all existing code
3. **Better Testability**: Existing tests remain valid, only new code needs testing
4. **Improved Flexibility**: System can grow without major refactoring
5. **Enhanced Stability**: Core logic stays stable while functionality expands

## How to Apply

1. **Identify Extension Points**: Determine where new behaviors will be added
2. **Use Abstractions**: Create interfaces or abstract classes for variation points
3. **Dependency Injection**: Inject implementations rather than hardcoding them
4. **Polymorphism**: Use inheritance or composition to add new behaviors
5. **Strategy Pattern**: Use interchangeable algorithms through interfaces

## Checklist

- [ ] New features don't require modifying existing code
- [ ] Uses interfaces/abstractions for extension points
- [ ] Behavior changes through new implementations, not code edits
- [ ] Adding a new variation requires creating a new class, not editing existing ones
- [ ] No if/else or switch statements that grow with new features

## Common Violations

- ❌ Adding new if/else branches for each new feature
- ❌ Modifying existing methods to support new behavior
- ❌ Hardcoding dependencies on concrete implementations
- ❌ Using type checks or instanceof to determine behavior

## See Examples

See examples in [examples/solid-ocp-example.md](../pseudo-examples/solid-ocp-example.md)
