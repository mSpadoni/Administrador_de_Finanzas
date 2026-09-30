# Single Responsibility Functions

## Rule

Functions must be focused on a single task. Each function must do one thing and do it well.

## When to Apply

- When writing any function or method
- When a function is handling multiple unrelated operations
- When describing a function requires using "and" or "or"
- When a function is becoming difficult to test or understand
- When refactoring complex logic

## Benefits

- **Easier to Understand**: Clear purpose makes code self-documenting
- **Better Testability**: Single responsibility means simpler tests
- **Higher Reusability**: Focused functions can be reused in different contexts
- **Easier Maintenance**: Changes affect only one specific behavior
- **Better Composition**: Small functions can be combined to build complex behaviors

## Checklist

- [ ] Function has one clear, well-defined purpose
- [ ] Can describe the function without using "and" or "or"
- [ ] Function is short (typically < 20 lines)
- [ ] All code in the function relates to its single responsibility
- [ ] Function name clearly indicates what it does

## Example

See [single-responsibility-functions-example.md](../pseudo-examples/single-responsibility-functions-example.md) for implementation examples.
