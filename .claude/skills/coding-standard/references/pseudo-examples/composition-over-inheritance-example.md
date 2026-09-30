# Composition Over Inheritance - Pseudo-Code Example

## Correct Implementation

Using composition to build behavior:

```pseudo
// Define interfaces
interface Logger {
  function log(message)
}

interface EmailSender {
  function send(to, message)
}

interface Database {
  function save(data)
}

// Composition with dependency injection
class UserService {
  logger
  emailSender
  database

  constructor(logger, emailSender, database) {
    this.logger = logger
    this.emailSender = emailSender
    this.database = database
  }

  function createUser(data) {
    logger.log("Creating user")

    user = database.save(data)

    emailSender.send(user.email, "Welcome!")

    return user
  }
}

// Strategy pattern with composition
interface PaymentProcessor {
  function process(amount)
}

class CreditCardProcessor implements PaymentProcessor {
  function process(amount) {
    // Credit card processing
    return {success: true, transactionId: "123"}
  }
}

class PayPalProcessor implements PaymentProcessor {
  function process(amount) {
    // PayPal processing
    return {success: true, transactionId: "456"}
  }
}

class OrderService {
  paymentProcessor

  constructor(paymentProcessor) {
    this.paymentProcessor = paymentProcessor
  }

  function checkout(order) {
    paymentProcessor.process(order.total)
  }
}
```

## Incorrect Implementation

Using inheritance for code reuse:

```pseudo
// Inheritance for code sharing
class BaseService {
  protected function log(message) {
    print(message)
  }

  protected function sendEmail(to, message) {
    // Email logic
  }

  protected function saveToDatabase(data) {
    // Database logic
  }
}

class UserService extends BaseService {
  function createUser(data) {
    log("Creating user")  // Tight coupling to parent
    saveToDatabase(data)
    sendEmail(data.email, "Welcome!")
    return data
  }
}

class OrderService extends BaseService {
  function createOrder(data) {
    log("Creating order")  // Tight coupling to parent
    saveToDatabase(data)
    return data
  }
}

// Deep inheritance hierarchy
class Animal {
  function move() { }
}

class Mammal extends Animal {
  function breathe() { }
}

class Primate extends Mammal {
  function climb() { }
}

class Human extends Primate {
  function speak() { }
}

// Inheriting concrete behavior
class Logger {
  function log(message) {
    print(message)
  }
}

class UserService extends Logger {
  function createUser(data) {
    log("Creating user")  // Inheriting concrete behavior
  }
}
```

## Why the Incorrect Version is Bad

1. **Tight Coupling**: Child classes are tightly coupled to parent implementation
2. **Fragile Base Class**: Changes to base class affect all descendants
3. **Limited Flexibility**: Cannot change behavior at runtime
4. **Hard to Test**: Must deal with entire inheritance chain when testing
5. **Poor Reusability**: Cannot mix and match behaviors easily

## Refactoring to Composition

```pseudo
// Before: Inheritance
class BaseService {
  protected function log(message) {
    print(message)
  }
}

class UserService extends BaseService {
  function createUser(data) {
    log("Creating user")
  }
}

// After: Composition
interface Logger {
  function log(message)
}

class ConsoleLogger implements Logger {
  function log(message) {
    print(message)
  }
}

class UserService {
  logger

  constructor(logger) {
    this.logger = logger
  }

  function createUser(data) {
    logger.log("Creating user")
  }
}

// Usage - can swap logger implementations
service1 = new UserService(new ConsoleLogger())
service2 = new UserService(new FileLogger())
service3 = new UserService(new CloudLogger())
```

## When Inheritance Is Appropriate

```pseudo
// Acceptable - True "is-a" relationship
abstract class Shape {
  abstract function area()
  abstract function perimeter()
}

class Circle extends Shape {
  radius

  constructor(radius) {
    this.radius = radius
  }

  function area() {
    return 3.14159 * radius * radius
  }

  function perimeter() {
    return 2 * 3.14159 * radius
  }
}

class Rectangle extends Shape {
  width
  height

  constructor(width, height) {
    this.width = width
    this.height = height
  }

  function area() {
    return width * height
  }

  function perimeter() {
    return 2 * (width + height)
  }
}
```

## Checklist

- [ ] Shared behavior is injected, not inherited
- [ ] Dependencies are interfaces, not concrete classes
- [ ] Inheritance hierarchy is shallow (max 2-3 levels)
- [ ] Inheritance represents true "is-a" relationships
- [ ] Behavior can be swapped at runtime

## Key Takeaways

- Prefer composition over inheritance for sharing behavior
- Use dependency injection to provide capabilities
- Inheritance creates tight coupling; composition promotes loose coupling
- Save inheritance for true "is-a" relationships
- Composition makes code more flexible and testable
- You can change behavior at runtime with composition
