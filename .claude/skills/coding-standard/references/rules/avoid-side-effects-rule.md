# Avoid Side Effects

## Rule

Avoid side effects in functions. Store state closest to where it is used. Functions must not modify external state or have hidden dependencies.

## When to Apply

- When writing business logic
- When a function modifies variables outside its scope
- When debugging unexpected state changes
- When designing pure functions
- When state management becomes complex

## Benefits

- **Predictable Behavior**: Functions always behave the same way
- **Easier Testing**: No need to set up external state
- **Better Debugging**: No hidden state mutations to track
- **Thread Safety**: Functions without side effects are thread-safe
- **Easier Reasoning**: Function behavior depends only on inputs

## Checklist

- [ ] Functions don't modify external variables
- [ ] State is passed as parameters and returned
- [ ] No hidden dependencies on global or module-level state
- [ ] I/O operations are isolated to edges of system
- [ ] Functions are pure when possible

## Example

See [avoid-side-effects-example.md](../pseudo-examples/avoid-side-effects-example.md) for implementation examples.
