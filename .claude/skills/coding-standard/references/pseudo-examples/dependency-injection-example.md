# Dependency Injection - Pseudo-Code Example

## Correct Implementation

Dependency injection with interfaces:

```pseudo
// Define interfaces
interface Database {
  function save(entity)
  function findById(id)
}

interface EmailService {
  function send(to, subject, body)
}

interface Logger {
  function info(message)
  function error(message, error)
}

// Service with constructor injection
class OrderService {
  database
  emailService
  logger

  constructor(database, emailService, logger) {
    this.database = database
    this.emailService = emailService
    this.logger = logger
  }

  function createOrder(order) {
    logger.info("Creating order for customer " + order.customerId)

    // Save order
    database.save(order)
    logger.info("Order saved with ID " + order.id)

    // Send confirmation email
    emailService.send(
      order.customerEmail,
      "Order Confirmation",
      "Your order has been created"
    )

    logger.info("Confirmation email sent")
    return order
  }
}

// Production usage
productionService = new OrderService(
  new MySQLDatabase(),
  new GmailService(),
  new ConsoleLogger()
)

// Test usage with mocks
testService = new OrderService(
  new MockDatabase(),
  new MockEmailService(),
  new MockLogger()
)
```

## Incorrect Implementation

Hard-coded dependencies:

```pseudo
// Hard-coded dependencies
class OrderService {
  database
  emailService
  logger

  constructor() {
    // Tightly coupled - creating dependencies internally
    database = new MySQLDatabase()
    emailService = new GmailService()
    logger = new ConsoleLogger()
  }

  function createOrder(order) {
    // Cannot swap dependencies
    database.save(order)
    emailService.send(order.customerEmail, "Order Confirmation", "")
  }

  function processPayment(orderId, token) {
    // Hard to test - always uses real services
    payment = new StripeGateway()
    payment.charge(100, token)
  }
}

// Cannot test without real database, email service, etc.
service = new OrderService()
// Stuck with MySQL, Gmail - cannot mock for testing
```

## Why the Incorrect Version is Bad

1. **Tight Coupling**: Directly depends on concrete implementations
2. **Hard to Test**: Cannot inject mocks, requires real services
3. **Inflexible**: Cannot swap implementations (e.g., MySQL to PostgreSQL)
4. **Violates DIP**: Depends on concretions, not abstractions
5. **Hidden Dependencies**: Dependencies not visible in constructor
6. **Configuration Issues**: Cannot configure different environments
7. **Difficult Maintenance**: Changes to dependencies require changing class

## Checklist

- [ ] Inject dependencies through constructor
- [ ] Depend on interfaces, not concrete classes
- [ ] Make dependencies explicit and visible
- [ ] Use mock implementations for testing

## Key Takeaways

- Inject dependencies through constructor
- Depend on interfaces, not concrete classes
- Make dependencies explicit and visible
- Use mock implementations for testing
- Enables loose coupling and high testability
- Follows Dependency Inversion Principle
- Constructor injection is preferred for required dependencies
- Dependencies should be immutable (readonly)
