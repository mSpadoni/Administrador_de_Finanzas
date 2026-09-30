# Single Responsibility Principle (SRP) - Pseudo-Code Example

## Correct Implementation

Each class has a single, well-defined responsibility:

```pseudo
// Each class focuses on ONE responsibility

class UserPasswordHasher {
  function hash(password) {
    return bcrypt.hash(password, salt=10)
  }

  function verify(password, hash) {
    return bcrypt.compare(password, hash)
  }
}

class UserValidator {
  function validate(user) {
    errors = []

    if (!user.email) {
      add "Email is required" to errors
    }

    if (user.password.length < 8) {
      add "Password must be at least 8 characters" to errors
    }

    return {
      isValid: errors.length == 0,
      errors: errors
    }
  }
}

class EmailService {
  function sendWelcomeEmail(user) {
    // Email sending logic only
  }
}

class UserRepository {
  function save(user) {
    // Database save logic only
  }
}
```

## Incorrect Implementation

Class with multiple responsibilities violating SRP:

```pseudo
// Multiple responsibilities in ONE class

class UserService {
  function hash(password) {
    // Password hashing
  }

  function validate(user) {
    // Validation logic
  }

  function sendEmail(user) {
    // Email sending
  }

  function saveToDatabase(user) {
    // Database operations
  }

  function logUserActivity(user, action) {
    // Logging logic
  }
}
```

## Why the Incorrect Version is Bad

1. **Multiple Reasons to Change**: Changes to email, validation, database, or logging all require modifying this class
2. **Hard to Test**: Must mock email, database, and logging dependencies even when testing validation
3. **Poor Reusability**: Cannot reuse password hashing without including all other dependencies
4. **Tight Coupling**: Class depends on too many unrelated components
5. **Difficult Maintenance**: Large class with mixed concerns is harder to understand and modify

## Checklist

- [ ] Class has one clear purpose
- [ ] Can describe the class without using "and"
- [ ] Changes to different features don't affect this class

## Key Takeaways

- Each class must focus on a single responsibility
- Separate concerns into different classes (validation, persistence, notification, etc.)
- If you need "and" to describe a class, it likely violates SRP
- Smaller, focused classes are easier to maintain, test, and reuse
