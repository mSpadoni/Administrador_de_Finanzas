# Liskov Substitution Principle (LSP) - Pseudo-Code Example

## Correct Implementation

Derived classes maintain the parent's contract:

```pseudo
// Base class defines contract
abstract class PaymentProcessor {
  abstract function process(amount) returns PaymentResult
}

class StripePaymentProcessor extends PaymentProcessor {
  function process(amount) {
    // Always returns PaymentResult, never throws unexpected errors
    try {
      result = stripe.charge(amount)
      return {success: true, transactionId: result.id}
    } catch (error) {
      return {success: false, error: error.message}
    }
  }
}

class PaypalPaymentProcessor extends PaymentProcessor {
  function process(amount) {
    // Same pattern - returns PaymentResult, handles errors internally
    try {
      result = paypal.processPayment(amount)
      return {success: true, transactionId: result.id}
    } catch (error) {
      return {success: false, error: error.message}
    }
  }
}
```

## Incorrect Implementation

Derived class breaks the parent's contract:

```pseudo
// Violates parent contract
class BrokenPaypalProcessor extends PaymentProcessor {
  function process(amount) {
    // Adds precondition not in parent
    if (amount > 10000) {
      throw Error("Amount too high")  // Unexpected behavior!
    }
    // Different behavior than parent contract
  }
}
```

## Why the Incorrect Version is Bad

1. **Breaks Substitutability**: Cannot reliably substitute BrokenPaypalProcessor for PaymentProcessor
2. **Unexpected Behavior**: Code expecting no exceptions suddenly fails
3. **Violated Contract**: Parent promises PaymentResult, child throws exceptions
4. **Stronger Preconditions**: Child requires amount <= 10000, parent doesn't
5. **Fragile Code**: Callers must know which subtype they have to handle it correctly

## Checklist

- [ ] Child classes don't add preconditions not in parent
- [ ] Child classes don't weaken postconditions from parent
- [ ] No unexpected exceptions in overridden methods
- [ ] Maintains parent class invariants

## Key Takeaways

- Derived classes must honor all parent class contracts
- Don't add preconditions not in the parent
- Don't weaken postconditions from the parent
- Handle errors the same way as the parent
- Substitutability means you can use any derived class without knowing its type
