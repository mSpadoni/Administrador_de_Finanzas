# Composition Over Inheritance

## Rule

Prefer composition over inheritance. Build complex behavior by combining simple, focused components rather than using deep inheritance hierarchies.

## When to Apply

- When designing class relationships
- When you need to share behavior between classes
- When inheritance creates tight coupling
- When you need flexibility to change behavior at runtime
- When inheritance hierarchy is becoming deep or complex

## Benefits

- **Flexibility**: Behavior can be changed at runtime by swapping dependencies
- **Loose Coupling**: Components depend on interfaces, not concrete implementations
- **Better Testability**: Dependencies can be easily mocked
- **Simpler Structure**: Avoids deep inheritance hierarchies
- **Easier to Maintain**: Changes to one component don't cascade through inheritance chain

## Checklist

- [ ] Classes use composition for shared behavior
- [ ] Dependencies are injected rather than inherited
- [ ] Inheritance is only used for true "is-a" relationships
- [ ] Inheritance hierarchy is shallow (max 2-3 levels)
- [ ] Behavior can be changed by swapping dependencies

## Example

See [composition-over-inheritance-example.md](../pseudo-examples/composition-over-inheritance-example.md) for implementation examples.
