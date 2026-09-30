# Single Level of Abstraction

## Rule

Functions must operate at a single level of abstraction. Don't mix high-level operations with low-level details in the same function.

## When to Apply

- When writing any function
- When a function mixes business logic with implementation details
- When some code is at a different conceptual level
- When refactoring complex functions
- When functions are hard to understand

## Benefits

- **Easier to Read**: Consistent abstraction level is easier to follow
- **Better Organization**: Each abstraction level has its own function
- **Clearer Intent**: High-level code reads like prose
- **Easier Maintenance**: Change implementation without affecting high-level logic
- **Better Testability**: Each level can be tested independently

## Checklist

- [ ] All operations in function are at same abstraction level
- [ ] Low-level details are in separate helper functions
- [ ] High-level functions read like step-by-step instructions
- [ ] Don't mix database queries with business logic
- [ ] Don't mix string formatting with domain operations

## Example

See [single-level-abstraction-example.md](../pseudo-examples/single-level-abstraction-example.md) for implementation examples.
