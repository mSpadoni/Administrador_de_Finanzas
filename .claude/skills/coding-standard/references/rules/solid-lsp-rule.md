# Liskov Substitution Principle (LSP)

## Rule

Subtypes **must** be substitutable for their base types without altering the correctness of the program.

## Scope

**All languages** - This principle applies universally to languages with inheritance or polymorphism.

## When to Apply

- Using inheritance or polymorphism in class hierarchies
- Creating derived classes or subclasses
- Implementing interfaces or abstract classes
- Designing API contracts that must remain consistent
- Working with dependency injection and polymorphic behavior

## Benefits

1. **Predictable Behavior**: Substituting derived classes doesn't break functionality
2. **Stronger Contracts**: Clear expectations for all implementations
3. **Safer Refactoring**: Can change implementations without side effects
4. **Better Testability**: Can mock or stub with confidence
5. **Reduced Bugs**: Prevents unexpected behavior in polymorphic code

## How to Apply

1. **Maintain Contracts**: Derived classes must honor parent class contracts
2. **No Stronger Preconditions**: Don't make input requirements stricter
3. **No Weaker Postconditions**: Don't make output guarantees weaker
4. **Preserve Invariants**: Maintain all parent class invariants
5. **Avoid Unexpected Exceptions**: Don't throw exceptions the parent doesn't throw
6. **Behavioral Consistency**: Derived classes should behave like parent expects

## Checklist

- [ ] Child classes don't weaken preconditions (input requirements)
- [ ] Child classes don't strengthen postconditions (output guarantees)
- [ ] No unexpected exceptions in overridden methods
- [ ] Maintains parent class invariants
- [ ] Derived class can be used anywhere parent class is expected
- [ ] No type checking required to determine which subtype you have

## Common Violations

- ❌ Throwing exceptions not declared in parent
- ❌ Accepting narrower input types than parent
- ❌ Returning broader output types than parent
- ❌ Requiring additional preconditions not in parent
- ❌ Not fulfilling parent's postconditions
- ❌ Violating parent's invariants

## See Examples

See examples in [examples/solid-lsp-example.md](../pseudo-examples/solid-lsp-example.md)
