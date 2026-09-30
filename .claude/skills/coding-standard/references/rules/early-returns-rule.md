# Early Returns

## Rule

Use early returns to handle edge cases and validation at the beginning of functions. This reduces nesting and improves readability.

## When to Apply

- When validating function inputs
- When checking preconditions
- When handling error cases
- When dealing with optional or nullable values
- When implementing guard clauses

## Benefits

- **Reduced Nesting**: Eliminates deeply nested if-else structures
- **Improved Readability**: Happy path is clear and at the end
- **Easier Maintenance**: Edge cases are handled upfront
- **Better Flow**: Main logic isn't buried in conditional blocks
- **Clearer Intent**: Preconditions are explicit

## Checklist

- [ ] Validation and error cases are handled first
- [ ] Nesting level is minimized (ideally 1-2 levels max)
- [ ] Happy path is at the end of the function
- [ ] Guard clauses are used for preconditions
- [ ] Function is easier to read top-to-bottom

## Example

See [early-returns-example.md](../pseudo-examples/early-returns-example.md) for implementation examples.
