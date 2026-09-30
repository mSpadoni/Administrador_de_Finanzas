# Pure Functions

## Rule

Functions must be pure (stateless) whenever possible. A pure function always produces the same output for the same input and has no side effects.

## When to Apply

- When writing business logic calculations
- When implementing data transformations
- When creating utility functions
- When the function doesn't need to maintain state or perform I/O
- When testability and predictability are important

## Benefits

- **Easier to Reason About**: No hidden dependencies or state mutations
- **Better Testability**: No mocking required, same inputs always produce same outputs
- **Higher Reusability**: Can be used anywhere without worrying about side effects
- **Thread Safety**: Pure functions are inherently thread-safe
- **Memoization**: Results can be cached since output depends only on input

## Checklist

- [ ] Function always returns the same output for the same input
- [ ] Function doesn't modify external state or variables
- [ ] Function doesn't perform I/O operations
- [ ] Function doesn't depend on mutable global state
- [ ] Function has no side effects

## Example

See [pure-functions-example.md](../pseudo-examples/pure-functions-example.md) for implementation examples.
