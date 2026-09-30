# Keep Functions Small

## Rule

Functions must be small and focused. Target less than 20 lines per function. Extract complex logic into separate functions.

## When to Apply

- When writing any function or method
- When a function exceeds 20 lines
- When a function has multiple levels of abstraction
- When refactoring complex code
- When code becomes difficult to understand

## Benefits

- **Easier to Understand**: Small functions are easier to comprehend
- **Better Testability**: Small functions are simpler to test
- **Higher Reusability**: Focused functions can be reused
- **Easier Debugging**: Smaller scope makes bugs easier to find
- **Self-Documenting**: Function name describes what code does

## Checklist

- [ ] Function is less than 20 lines (target)
- [ ] Function has single responsibility
- [ ] Complex logic is extracted to helper functions
- [ ] Function name clearly describes what it does
- [ ] Function is easy to test in isolation

## Example

See [keep-functions-small-example.md](../pseudo-examples/keep-functions-small-example.md) for implementation examples.
