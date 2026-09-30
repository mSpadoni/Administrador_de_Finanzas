# Class Design - Pseudo-Code Example

## Correct Implementation

Separating data and behavior:

```pseudo
// Plain objects for data (DTOs, entities, records)
interface User {
  readonly id
  readonly name
  readonly email
  readonly createdAt
}

interface Order {
  readonly id
  readonly userId
  readonly items
  readonly total
  readonly status
}

// Factory functions for creating data
function createUser(name, email) {
  return {
    id: generateId(),
    name: name,
    email: email,
    createdAt: currentDate()
  }
}

// Functions operate on data
function validateUser(user) {
  errors = []

  if (!user.email contains "@") {
    add "Invalid email" to errors
  }

  if (user.name.length < 2) {
    add "Name too short" to errors
  }

  return {isValid: errors.length == 0, errors}
}

function calculateOrderTotal(order) {
  sum = 0
  for each item in order.items {
    sum = sum + item.price * item.quantity
  }
  return sum
}

// Classes for stateful services
class UserRepository {
  cache = {}
  database

  constructor(database) {
    this.database = database
  }

  function getUser(id) {
    // Check cache
    if (id in cache) {
      return cache[id]
    }

    // Fetch from database
    user = database.findUser(id)

    if (user) {
      cache[id] = user
    }

    return user
  }

  function saveUser(user) {
    database.saveUser(user)
    cache[user.id] = user
  }
}
```

## Incorrect Implementation

Using classes for simple data:

```pseudo
// Class for simple data
class User {
  private id
  private name
  private email

  constructor(id, name, email) {
    this.id = id
    this.name = name
    this.email = email
  }

  function getId() {
    return id
  }

  function getName() {
    return name
  }

  function setName(value) {
    name = value
  }

  function getEmail() {
    return email
  }

  function setEmail(value) {
    email = value
  }

  // Validation in entity class
  function validate() {
    return email contains "@"
  }

  // Business logic in entity class
  function getDisplayName() {
    return name + " (" + email + ")"
  }
}

// Mixing data and behavior
class Order {
  private items
  private status

  constructor(items, status) {
    this.items = items
    this.status = status
  }

  function getItems() {
    return items
  }

  function addItem(item) {
    items.push(item)  // Mutation
  }

  // Business logic mixed with data
  function getTotal() {
    sum = 0
    for each item in items {
      sum = sum + item.price
    }
    return sum
  }

  // State management in entity
  function markAsPaid() {
    status = "paid"
  }
}
```

## Why the Incorrect Version is Bad

1. **Unnecessary Complexity**: Getters/setters add boilerplate
2. **Mutation**: Classes encourage mutable state
3. **Tight Coupling**: Behavior is coupled to specific class
4. **Hard to Serialize**: Classes don't serialize to JSON cleanly
5. **Poor Composition**: Cannot easily compose data

## Checklist

- [ ] Use plain objects/interfaces for data
- [ ] Use classes for stateful services
- [ ] Data structures are immutable
- [ ] Functions operate on data
- [ ] Behavior is separated from data

## Key Takeaways

- Use plain objects for data (DTOs, entities, value objects)
- Use classes for stateful services (repositories, managers, caches)
- Keep data immutable
- Put behavior in pure functions that operate on data
- Classes should encapsulate state and behavior together, not just hold data
