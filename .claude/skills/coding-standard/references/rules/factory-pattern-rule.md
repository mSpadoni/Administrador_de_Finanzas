# Factory Pattern

## Rule

Create objects without specifying the exact classes to create. Use a factory method or class to encapsulate object creation logic.

## When to Apply

- When object creation is complex and should be centralized
- When you need to create different types of objects based on runtime conditions
- When clients shouldn't depend on concrete classes
- When you want to decouple object creation from usage
- When creation logic may change or be extended in the future
- When creating families of related objects

## Benefits

- **Decoupling**: Separates object creation from usage
- **Single Responsibility**: Centralizes creation logic
- **Open/Closed Principle**: Easy to add new types without modifying existing code
- **Flexibility**: Can change creation logic without affecting clients
- **Testability**: Easy to substitute mock objects
- **Type Safety**: Factory can ensure proper object initialization

## How to Apply

1. **Define Interface**: Create a common interface for all products
2. **Concrete Implementations**: Implement the interface with concrete classes
3. **Factory Class**: Create a factory class with creation methods
4. **Creation Logic**: Encapsulate object creation logic in the factory
5. **Return Interface**: Factory returns interface type, not concrete types

## Checklist

- [ ] Common interface defined for all products
- [ ] Concrete classes implement the interface
- [ ] Factory encapsulates creation logic
- [ ] Factory method returns interface/base type
- [ ] Clients depend on interface, not concrete classes
- [ ] Easy to add new product types without modifying existing code

## Common Use Cases

| Use Case                  | Example                                                    |
| ------------------------- | ---------------------------------------------------------- |
| **Payment Processing**    | Create different payment processors (Stripe, PayPal, etc.) |
| **UI Components**         | Create platform-specific UI elements                       |
| **Data Parsers**          | Create parsers based on file format (JSON, XML, CSV)       |
| **Database Connections**  | Create connections for different databases                 |
| **Notification Services** | Create different notification channels (Email, SMS, Push)  |

## Variations

- **Simple Factory**: Single factory class with creation methods
- **Factory Method**: Subclasses override factory method to change product types
- **Abstract Factory**: Create families of related objects

## See Examples

See examples in [examples/factory-pattern-example.md](../pseudo-examples/factory-pattern-example.md)
