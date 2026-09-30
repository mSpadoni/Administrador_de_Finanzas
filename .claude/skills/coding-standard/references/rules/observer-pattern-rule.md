# Observer Pattern

## Rule

Define a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically.

## When to Apply

- When changes to one object require changing others
- When an object should notify other objects without making assumptions about who they are
- Implementing event handling systems
- Building pub/sub (publish-subscribe) systems
- When you need loose coupling between objects
- Implementing reactive programming patterns
- When multiple objects need to react to state changes

## Benefits

- **Loose Coupling**: Subject and observers are loosely coupled
- **Dynamic Relationships**: Can add/remove observers at runtime
- **Broadcast Communication**: One-to-many notification
- **Reusability**: Observers and subjects can be reused independently
- **Open/Closed Principle**: Can add new observers without modifying subject
- **Flexibility**: Observers can be of different types

## How to Apply

1. **Define Subject**: Create a subject class that maintains observer list
2. **Observer Interface**: Define an observer interface with update method
3. **Attach/Detach**: Provide methods to add/remove observers
4. **Notify**: When state changes, notify all observers
5. **Update Method**: Observers implement update to respond to changes

## Checklist

- [ ] Subject maintains list of observers
- [ ] Observers implement common interface
- [ ] Subject provides attach/detach methods
- [ ] Subject calls notify when state changes
- [ ] Observers receive updates through defined interface
- [ ] Loose coupling maintained between subject and observers

## Common Use Cases

| Use Case             | Example                                      |
| -------------------- | -------------------------------------------- |
| **Event Systems**    | UI event handling, DOM events                |
| **MVC Architecture** | Model notifies views of changes              |
| **Monitoring**       | System monitoring, metrics collection        |
| **Messaging**        | Pub/sub messaging systems                    |
| **Data Binding**     | Reactive UI frameworks (React, Vue, Angular) |
| **Notifications**    | Multi-channel notification systems           |

## Variations

- **Push Model**: Subject sends detailed data to observers
- **Pull Model**: Subject notifies, observers pull data they need
- **Event Emitter**: Named events with multiple listeners

## Cautions

- Memory leaks if observers aren't properly detached
- Can be difficult to debug with many observers
- Order of notification may matter in some cases
- Performance impact with many observers

## See Examples

See examples in [examples/observer-pattern-example.md](../pseudo-examples/observer-pattern-example.md)
