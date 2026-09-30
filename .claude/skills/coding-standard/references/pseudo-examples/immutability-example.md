# Immutability - Pseudo-Code Example

## Correct Implementation

Immutable data operations that create new objects instead of modifying existing ones:

```pseudo
// Object immutability
user = {name: "John", age: 30, email: "john@example.com"}
updatedUser = copy user with {age: 31}  // Create new object

// Array immutability
items = [1, 2, 3]
newItems = [...items, 4]  // Create new array
filtered = items.filter(x => x > 1)  // Returns new array
mapped = items.map(x => x * 2)  // Returns new array

// Nested object updates
user = {
  name: "John",
  address: {street: "123 Main St", city: "Boston"}
}

updatedUser = {
  ...user,
  address: {...user.address, city: "New York"}
}

// Immutable function parameters
function updateUserAge(user, newAge) {
  return copy user with {age: newAge}
}

// Array operations without mutation
function addItem(items, newItem) {
  return [...items, newItem]
}

function removeItem(items, index) {
  return items.filter((item, i) => i != index)
}

function updateItem(items, index, newItem) {
  return items.map((item, i) => i == index ? newItem : item)
}
```

## Incorrect Implementation

Mutable operations that modify existing data:

```pseudo
// Direct object mutation
user = {name: "John", age: 30}
user.age = 31  // Mutates original object
user.email = "john@example.com"  // Mutates original object

// Array mutation
items = [1, 2, 3]
items.push(4)  // Mutates original array
items[0] = 10  // Mutates original array
items.splice(1, 1)  // Mutates original array

// Nested mutation
user = {
  name: "John",
  address: {street: "123 Main St", city: "Boston"}
}
user.address.city = "New York"  // Mutates nested object

// Function mutating input
function updateUserAge(user, newAge) {
  user.age = newAge  // Mutates input parameter
}

// Array sorting in place
function sortItems(items) {
  return items.sort()  // Mutates original array
}
```

## Why the Incorrect Version is Bad

1. **Unexpected Side Effects**: Original data changes can affect other parts of the code
2. **Hard to Debug**: Must track where and when mutations occur
3. **Race Conditions**: Mutable shared state causes bugs in concurrent code
4. **Breaks Referential Transparency**: Same function call can produce different results
5. **Difficult to Test**: Must verify state before and after each operation

## Refactoring Mutable to Immutable

```pseudo
// Before: Mutable
function addDiscount(order, discount) {
  order.total = order.total - discount
  order.discountApplied = true
}

// After: Immutable
function addDiscount(order, discount) {
  return {
    ...order,
    total: order.total - discount,
    discountApplied: true
  }
}

// Before: Mutable array sorting
function sortUsers(users) {
  return users.sort((a, b) => a.name compare b.name)
}

// After: Immutable array sorting
function sortUsers(users) {
  return [...users].sort((a, b) => a.name compare b.name)
}
```

## When Mutation is Acceptable

Sometimes local mutation is acceptable for performance:

```pseudo
// Acceptable - Local mutation inside pure function
function buildLookupMap(items) {
  map = {}  // Local mutable state

  for each item in items {
    map[item.id] = item  // Mutating local variable
  }

  return map  // Return is effectively immutable to caller
}

// Acceptable - Performance-critical operations
function processLargeDataset(data) {
  result = new Array(data.length)  // Pre-allocated mutable array

  for i from 0 to data.length {
    result[i] = expensiveComputation(data[i])
  }

  return result
}
```

## Checklist

- [ ] Objects are not modified after creation
- [ ] Array methods return new arrays (map, filter, slice)
- [ ] Use spread operator for updates
- [ ] Mark parameters as readonly/const where appropriate
- [ ] Functions return new data instead of mutating inputs

## Key Takeaways

- Immutability prevents unintended side effects
- Create new objects/arrays instead of modifying existing ones
- Use spread operator and array methods for immutable updates
- Local mutation inside functions is acceptable if not exposed
- Immutable data is easier to reason about and debug
