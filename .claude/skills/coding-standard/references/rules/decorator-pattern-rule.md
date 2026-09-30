# Decorator Pattern

## Rule

Attach additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality.

## When to Apply

- When you need to add responsibilities to objects without affecting other objects
- When extension by subclassing is impractical or creates too many subclasses
- When you want to add/remove responsibilities dynamically at runtime
- When you need to combine multiple optional features
- When inheritance would lead to class explosion
- When you want to follow the Open/Closed Principle

## Benefits

- **Flexibility**: Add/remove responsibilities at runtime
- **No Subclass Explosion**: Avoid creating many subclasses for combinations
- **Single Responsibility**: Each decorator handles one concern
- **Open/Closed Principle**: Extend without modifying existing classes
- **Composability**: Combine decorators in different ways
- **Transparent to Client**: Client treats decorated and undecorated objects the same

## How to Apply

1. **Component Interface**: Define interface for objects that can have responsibilities added
2. **Concrete Component**: Implement the base component
3. **Decorator Base**: Create abstract decorator implementing the component interface
4. **Concrete Decorators**: Implement decorators that add specific responsibilities
5. **Composition**: Decorators hold a reference to a component and add behavior

## Checklist

- [ ] Component interface defines the contract
- [ ] Concrete component provides base implementation
- [ ] Decorators implement the same interface as component
- [ ] Decorators hold reference to wrapped component
- [ ] Decorators add behavior before/after delegating to component
- [ ] Multiple decorators can be stacked/combined

## Common Use Cases

| Use Case            | Example                                          |
| ------------------- | ------------------------------------------------ |
| **UI Components**   | Adding borders, scrollbars, shadows to windows   |
| **I/O Streams**     | BufferedReader, GZIPInputStream wrapping streams |
| **Coffee Shop**     | Adding milk, sugar, whipped cream to coffee      |
| **Text Formatting** | Bold, italic, underline decorators               |
| **Logging**         | Adding logging to existing classes               |
| **Caching**         | Adding caching layer to data access              |

## Comparison

| Pattern       | Purpose                                          |
| ------------- | ------------------------------------------------ |
| **Decorator** | Add responsibilities to individual objects       |
| **Adapter**   | Change interface of existing object              |
| **Proxy**     | Control access to an object                      |
| **Composite** | Treat individual and composite objects uniformly |

## Cautions

- Can result in many small objects
- Decorated object is not identical to original (identity issues)
- Order of decoration can matter
- Can be complex to debug with many layers

## See Examples

See examples in [examples/decorator-pattern-example.md](../pseudo-examples/decorator-pattern-example.md)
