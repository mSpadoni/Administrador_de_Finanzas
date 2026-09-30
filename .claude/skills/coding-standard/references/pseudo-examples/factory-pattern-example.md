# Factory Pattern - Pseudo-Code Example

## Correct Implementation

Factory pattern with interface and concrete implementations:

```pseudo
// Define interface
interface PaymentProcessor {
  function processPayment(amount)
  function refund(transactionId, amount)
}

// Concrete implementations
class StripeProcessor implements PaymentProcessor {
  function processPayment(amount) {
    // Stripe-specific logic
    print("Processing $" + amount + " via Stripe")
    return true
  }

  function refund(transactionId, amount) {
    // Stripe refund logic
    return true
  }
}

class PayPalProcessor implements PaymentProcessor {
  function processPayment(amount) {
    // PayPal-specific logic
    print("Processing $" + amount + " via PayPal")
    return true
  }

  function refund(transactionId, amount) {
    // PayPal refund logic
    return true
  }
}

// Factory
class PaymentProcessorFactory {
  static function createProcessor(processorType) {
    if (processorType == "stripe") {
      return new StripeProcessor()
    } else if (processorType == "paypal") {
      return new PayPalProcessor()
    } else {
      throw Error("Unknown processor: " + processorType)
    }
  }
}

// Usage
processor = PaymentProcessorFactory.createProcessor("stripe")
processor.processPayment(100.00)
```

## Incorrect Implementation

Directly instantiating concrete classes:

```pseudo
// Direct instantiation and type checking
class PaymentService {
  function processPayment(processorType, amount) {
    // Creating concrete instances directly
    if (processorType == "stripe") {
      processor = new StripeProcessor()
      // Stripe-specific code
      return processor.charge(amount)
    } else if (processorType == "paypal") {
      processor = new PayPalProcessor()
      // PayPal-specific code
      return processor.sendPayment(amount)
    } else {
      throw Error("Unknown processor")
    }
  }
}

// Client code depends on concrete classes
function checkout(amount, useStripe) {
  if (useStripe) {
    processor = new StripeProcessor()
  } else {
    processor = new PayPalProcessor()
  }

  processor.processPayment(amount)
}
```

## Why the Incorrect Version is Bad

1. **Tight Coupling**: Client code directly depends on concrete classes
2. **Violates Open/Closed**: Adding new processors requires modifying existing code
3. **Scattered Creation Logic**: Object creation spread throughout codebase
4. **Hard to Test**: Difficult to substitute mock objects
5. **Duplication**: Creation logic duplicated in multiple places
6. **Type Checking**: Using type checks instead of polymorphism

## Checklist

- [ ] Factory encapsulates object creation
- [ ] Clients depend on interfaces, not concrete classes
- [ ] Factory returns interface/abstract type
- [ ] Easy to extend with new types

## Key Takeaways

- Use factory to encapsulate object creation
- Clients should depend on interfaces, not concrete classes
- Factory returns interface/abstract base type
- Easy to extend with new types (Open/Closed Principle)
- Makes code more testable and maintainable
