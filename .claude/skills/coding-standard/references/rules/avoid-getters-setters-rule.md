# Avoid Getters/Setters

## Rule

Avoid getter and setter methods. They can lead to unexpected side effects and break encapsulation. Prefer immutable data structures and direct property access.

## When to Apply

- When designing data classes
- When getters/setters have side effects
- When encapsulation is violated by trivial accessors
- When working with DTOs and value objects
- When choosing between properties and methods

## Benefits

- **No Hidden Side Effects**: Direct access makes behavior explicit
- **Simpler Code**: Eliminates boilerplate accessor methods
- **True Encapsulation**: Avoid exposing internal state
- **Immutability**: Encourages immutable data structures
- **Clearer Intent**: Operations that change state are explicit functions

## Checklist

- [ ] No getter/setter methods with side effects
- [ ] Use public readonly fields for simple data
- [ ] Complex operations are explicit methods, not hidden in getters
- [ ] Validation happens in constructors or factory functions
- [ ] Data updates create new objects (immutability)

## Example

See [avoid-getters-setters-example.md](../pseudo-examples/avoid-getters-setters-example.md) for implementation examples.
