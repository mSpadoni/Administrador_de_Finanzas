# Avoid Module-Level Side Effects

## Rule

Avoid code executed at module scope. Wrap expensive operations, I/O, and initialization in lazy initialization functions instead.

## When to Apply

- When importing modules causes code to execute
- When module initialization performs I/O operations
- When expensive computations happen at module load
- When async operations occur at module level
- When refactoring modules with side effects

## Benefits

- **Faster Loading**: Modules load without executing expensive code
- **Better Error Handling**: Errors don't prevent module import
- **Lazy Initialization**: Code runs only when needed
- **Better Testing**: Can control when initialization happens
- **No Import Order Issues**: Modules don't depend on load order

## Checklist

- [ ] No I/O operations at module scope
- [ ] No expensive computations at module load
- [ ] No top-level await (use lazy async functions)
- [ ] Configuration is loaded on demand
- [ ] Module exports functions, not computed values

## Example

See [avoid-module-side-effects-example.md](../pseudo-examples/avoid-module-side-effects-example.md) for implementation examples.
