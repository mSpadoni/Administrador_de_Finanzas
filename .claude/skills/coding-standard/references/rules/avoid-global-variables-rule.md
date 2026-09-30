# Avoid Global Variables

## Rule

Avoid global mutable variables. They lead to unintended side effects and make code difficult to test and reason about.

## When to Apply

- When tempted to create module-level mutable state
- When multiple functions need to share data
- When designing application state management
- When refactoring code with global variables
- When choosing between global and local scope

## Benefits

- **Prevents Side Effects**: Functions cannot modify shared global state
- **Better Testability**: No hidden dependencies on global state
- **Easier Reasoning**: Function behavior depends only on inputs
- **Thread Safety**: No shared mutable state reduces concurrency issues
- **Explicit Dependencies**: Dependencies are passed as parameters

## Checklist

- [ ] No global mutable variables
- [ ] Configuration is passed as parameters or injected
- [ ] State is encapsulated in classes or modules
- [ ] Functions receive all dependencies as parameters
- [ ] Global constants are acceptable (immutable values)

## Example

See [avoid-global-variables-example.md](../pseudo-examples/avoid-global-variables-example.md) for implementation examples.
