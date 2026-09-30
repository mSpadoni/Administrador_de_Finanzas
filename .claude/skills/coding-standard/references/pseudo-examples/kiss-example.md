# KISS - Keep It Simple, Stupid - Pseudo-Code Example

## Correct Implementation

Simple and straightforward solution:

```pseudo
// Simple and clear
class PasswordValidator {
  function validate(password) {
    return password.length >= 8
       AND password contains uppercase letter
       AND password contains digit
  }
}

// Usage is straightforward
validator = new PasswordValidator()
isValid = validator.validate("MyPass123")
```

## Incorrect Implementation

Over-engineered solution with unnecessary complexity:

```pseudo
// Over-engineered with unnecessary abstractions
class PasswordValidator {
  rules = []
  ruleEngine
  strategyFactory
  policyManager

  function validate(password) {
    return ruleEngine
      .withStrategy(strategyFactory.create("password"))
      .withPolicy(policyManager.getDefault())
      .applyRules(rules)
      .execute(password)
  }
}

// Requires many additional classes for a simple task
class RuleEngine { ... }
class StrategyFactory { ... }
class PolicyManager { ... }
class ValidationRule { ... }
```

## Why the Incorrect Version is Bad

1. **Unnecessary Complexity**: Simple task requires multiple classes and abstractions
2. **Harder to Understand**: Requires understanding multiple components
3. **More Code to Maintain**: More classes means more potential bugs
4. **Slower Development**: Takes much longer to implement
5. **Over-Engineering**: Using design patterns where they're not needed

## Checklist

- [ ] Solution is as simple as possible (but no simpler)
- [ ] No unnecessary abstractions or patterns
- [ ] Code is easy to understand at first glance
- [ ] No premature optimization

## Key Takeaways

- Start with the simplest solution that works
- Don't add abstraction layers until you need them
- Simple code beats clever code
- Readability is more important than showing off design pattern knowledge
- If requirements change, THEN refactor to add complexity
