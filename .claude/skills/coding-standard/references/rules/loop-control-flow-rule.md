# Loop Control Flow

## Rule

Use plain loops when break/continue control flow is needed. Use declarative array methods (map, filter, reduce) when no control flow is required.

## When to Apply

- When iterating over collections
- When you need to exit a loop early (break)
- When you need to skip iterations (continue)
- When the operation can be expressed declaratively
- When choosing between imperative and declarative approaches

## Benefits

- **Clearer Intent**: Loop type indicates whether control flow is used
- **Better Readability**: Declarative methods are more expressive
- **Fewer Bugs**: Declarative methods reduce manual index tracking
- **Functional Style**: Encourages immutable, composable operations
- **Appropriate Tool**: Use the right construct for the situation

## Checklist

- [ ] Use for/while loops when break/continue is needed
- [ ] Use map/filter/reduce when transforming collections
- [ ] Avoid forEach (use for-of instead or declarative methods)
- [ ] Don't try to break/continue from array methods
- [ ] Choose the most readable approach for the situation

## Example

See [loop-control-flow-example.md](../pseudo-examples/loop-control-flow-example.md) for implementation examples.
