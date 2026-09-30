# Immutability

## Rule

Prefer immutable data structures. Data must not be modified after creation; instead, create new copies with desired changes.

## When to Apply

- When working with data objects and structures
- When multiple parts of code need to reference the same data
- When writing concurrent or parallel code
- When you need to track changes or maintain history
- When you want to prevent unintended side effects

## Benefits

- **Prevents Side Effects**: Original data cannot be accidentally modified
- **Thread Safety**: Immutable data is inherently safe to share between threads
- **Easier Debugging**: No need to track where and when data changed
- **Predictable Behavior**: Functions cannot modify input parameters
- **Enables Optimizations**: Compilers and runtimes can optimize immutable data

## Checklist

- [ ] Data structures are not modified after creation
- [ ] Functions return new objects instead of modifying existing ones
- [ ] Use const/readonly/final qualifiers where appropriate
- [ ] Array operations create new arrays instead of mutating
- [ ] Object updates create new objects with spread/copy operations

## Example

See [immutability-example.md](../pseudo-examples/immutability-example.md) for implementation examples.
