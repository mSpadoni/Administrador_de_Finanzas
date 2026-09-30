# Strategy Pattern

## Rule

Define a family of algorithms, encapsulate each one, and make them interchangeable. Strategy lets the algorithm vary independently from clients that use it.

## When to Apply

- When you have multiple algorithms for a specific task
- When you want to switch algorithms at runtime
- When you need to avoid conditional statements for algorithm selection
- When algorithms should be isolated from client code
- When different variations of an algorithm are needed
- When you want to make algorithms independently testable

## Benefits

- **Flexibility**: Easily switch algorithms at runtime
- **Open/Closed Principle**: Add new strategies without modifying existing code
- **Eliminates Conditionals**: Replaces complex if/else or switch statements
- **Testability**: Each strategy can be tested independently
- **Separation of Concerns**: Algorithms isolated from context
- **Reusability**: Strategies can be reused across different contexts

## How to Apply

1. **Strategy Interface**: Define a common interface for all algorithms
2. **Concrete Strategies**: Implement the interface with different algorithms
3. **Context Class**: Holds a reference to a strategy
4. **Strategy Injection**: Allow setting/changing strategy at runtime
5. **Delegate Execution**: Context delegates algorithm execution to strategy

## Checklist

- [ ] Strategy interface defines algorithm contract
- [ ] Multiple concrete strategies implement the interface
- [ ] Context class holds strategy reference
- [ ] Strategy can be set/changed at runtime
- [ ] Context delegates work to strategy
- [ ] No conditional logic for algorithm selection in context

## Common Use Cases

| Use Case        | Example                                                       |
| --------------- | ------------------------------------------------------------- |
| **Compression** | Different compression algorithms (ZIP, GZIP, BZIP2)           |
| **Sorting**     | Various sorting strategies (QuickSort, MergeSort, BubbleSort) |
| **Payment**     | Payment methods (CreditCard, PayPal, Crypto)                  |
| **Validation**  | Different validation rules                                    |
| **Routing**     | Different routing algorithms                                  |
| **Pricing**     | Pricing strategies (Regular, Discount, Premium)               |

## Comparison

| Pattern      | Purpose                                 |
| ------------ | --------------------------------------- |
| **Strategy** | Choose algorithm at runtime             |
| **Factory**  | Create objects of different types       |
| **State**    | Change behavior based on internal state |

## See Examples

See examples in [examples/strategy-pattern-example.md](../pseudo-examples/strategy-pattern-example.md)
