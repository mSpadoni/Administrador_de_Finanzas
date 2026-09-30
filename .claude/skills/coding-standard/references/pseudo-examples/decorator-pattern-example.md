# Decorator Pattern - Pseudo-Code Example

## Correct Implementation

Decorator pattern with interface and composition:

```pseudo
// Component interface
interface Coffee {
  function cost()
  function description()
}

// Base component
class SimpleCoffee implements Coffee {
  function cost() {
    return 5
  }

  function description() {
    return "Simple coffee"
  }
}

// Decorators
class MilkDecorator implements Coffee {
  coffee

  constructor(coffee) {
    this.coffee = coffee
  }

  function cost() {
    return coffee.cost() + 2
  }

  function description() {
    return coffee.description() + ", milk"
  }
}

class SugarDecorator implements Coffee {
  coffee

  constructor(coffee) {
    this.coffee = coffee
  }

  function cost() {
    return coffee.cost() + 1
  }

  function description() {
    return coffee.description() + ", sugar"
  }
}

// Usage - stack decorators
coffee = new SimpleCoffee()  // cost: 5
coffee = new MilkDecorator(coffee)  // cost: 7
coffee = new SugarDecorator(coffee)  // cost: 8
print(coffee.description())  // "Simple coffee, milk, sugar"
```

## Incorrect Implementation

Using inheritance instead of composition:

```pseudo
// Using inheritance leads to class explosion
class Coffee {
  function cost() { return 5 }
  function description() { return "Coffee" }
}

// Need separate class for each combination
class CoffeeWithMilk extends Coffee {
  function cost() { return super.cost() + 2 }
  function description() { return super.description() + ", milk" }
}

class CoffeeWithSugar extends Coffee {
  function cost() { return super.cost() + 1 }
  function description() { return super.description() + ", sugar" }
}

// Need class for EVERY combination
class CoffeeWithMilkAndSugar extends Coffee {
  function cost() { return super.cost() + 3 }
  function description() { return super.description() + ", milk, sugar" }
}

class CoffeeWithMilkSugarAndWhippedCream extends Coffee {
  function cost() { return super.cost() + 6 }
  function description() { return super.description() + ", milk, sugar, whipped cream" }
}

// With 5 add-ons, you'd need 2^5 = 32 classes for all combinations!
```

## Why the Incorrect Version is Bad

1. **Class Explosion**: Need a class for every combination of features
2. **Violates Open/Closed**: Adding new add-on requires creating many new classes
3. **No Runtime Flexibility**: Cannot add/remove features dynamically
4. **Code Duplication**: Similar logic repeated across many classes
5. **Inflexible**: Cannot change combinations at runtime
6. **Maintenance Nightmare**: With N features, need 2^N classes for all combinations
7. **Tight Coupling**: Each combination is a separate class

## Checklist

- [ ] Uses composition instead of inheritance
- [ ] Decorators implement same interface as component
- [ ] Each decorator adds one responsibility
- [ ] Decorators can be stacked in any order

## Key Takeaways

- Use composition, not inheritance
- Decorators implement the same interface as the component
- Each decorator adds one specific responsibility
- Decorators can be stacked in any order
- Base component and decorators are interchangeable
- Avoids class explosion from inheritance
- Enables runtime flexibility
- Follows Open/Closed Principle
