# Single Responsibility Principle (SRP)

## Rule

A class must have only one reason to change. Each class must have a single, well-defined responsibility.

## When to Apply

- When designing new classes or modules
- When a class is handling multiple unrelated concerns (validation, persistence, notification, etc.)
- When changes to different features require modifying the same class
- When describing a class requires using "and" or "or"

## Benefits

- **Easier Maintenance**: Changes to one responsibility don't affect others
- **Better Testability**: Focused classes are easier to test in isolation
- **Higher Cohesion**: Related functionality stays together
- **Reduced Coupling**: Classes have fewer dependencies
- **Clearer Code**: Single purpose makes code easier to understand

## Checklist

- [ ] Class has one clear, well-defined purpose
- [ ] Can describe the class without using "and" or "or"
- [ ] Changes to different features don't require modifying this class
- [ ] All methods in the class relate to its single responsibility
- [ ] Class dependencies are minimal and focused

## Example

See [solid-srp-example.md](../pseudo-examples/solid-srp-example.md) for implementation examples.
