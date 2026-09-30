# Class Design

## Rule

Separate data and behavior. Use plain data structures for data, classes only for stateful services that encapsulate behavior.

## When to Apply

- When deciding between class and plain object/struct
- When modeling domain entities
- When implementing services or repositories
- When data only needs to be stored and passed around
- When behavior requires maintaining state

## Benefits

- **Clearer Intent**: Distinction between data and stateful services
- **Simpler Data**: Data structures are easier to serialize and test
- **Functional Approach**: Data is immutable, behavior is in functions
- **Better Composition**: Functions can operate on any compatible data
- **Reduced Complexity**: Not everything needs to be a class

## Checklist

- [ ] Use plain objects/structs for data (DTOs, entities, records)
- [ ] Use classes for stateful services (repositories, managers, caches)
- [ ] Data structures don't have behavior methods
- [ ] Functions operate on data structures
- [ ] Classes encapsulate state and behavior together

## Example

See [class-design-example.md](../pseudo-examples/class-design-example.md) for implementation examples.
