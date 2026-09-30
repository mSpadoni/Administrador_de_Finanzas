# TDA - Tell, Don't Ask

## Rule

**Must** tell objects what to do, not ask for data and make decisions externally. Business logic **must** live with the data it operates on.

## Scope

**All languages** - This principle applies universally to object-oriented and encapsulation-focused design.

## When to Apply

- Object has data and related business logic
- Decision-making should be encapsulated within the object
- Behavior naturally belongs with the data
- Multiple clients need the same operation on the object
- Preventing logic duplication across callers
- Protecting object invariants and encapsulation

## Benefits

1. **Encapsulation**: Business logic stays with the data
2. **Reduced Coupling**: Clients don't need to know internal state
3. **Easier Maintenance**: Logic in one place, not scattered
4. **Single Source of Truth**: Behavior defined once
5. **Better Testability**: Test logic in the object, not in every caller
6. **Prevents Violations**: Object controls its own state transitions

## How to Apply

1. **Identify Behavior**: Look for logic that operates on object's data
2. **Move Logic**: Move decision-making into the object
3. **Create Commands**: Methods should be commands, not just data getters
4. **Encapsulate State**: Keep internal state private
5. **Tell, Don't Ask**: Call methods that do something, not getters that expose state

## Checklist

- [ ] Business logic lives with the data it operates on
- [ ] Methods are commands (do something), not just getters
- [ ] Clients tell the object what to do, don't ask for data
- [ ] Encapsulation is preserved (private state)
- [ ] No external code making decisions based on internal state
- [ ] Object controls its own state transitions

## When NOT to Apply

- **Data Transfer Objects (DTOs)**: Pure data structures with no behavior
- **Simple Value Objects**: Immutable objects representing values
- **Interop/Serialization**: When external systems need data format
- **Configuration Objects**: Simple key-value stores
- **Database Entities**: ORM models that map to tables

## Common Violations

- ❌ Exposing internal state with getters and setters
- ❌ Clients asking for data then making decisions
- ❌ Business logic scattered across callers
- ❌ Public setters allowing invalid state transitions
- ❌ Anemic domain models (data without behavior)

## See Examples

See examples in [examples/tda-example.md](../pseudo-examples/tda-example.md)
