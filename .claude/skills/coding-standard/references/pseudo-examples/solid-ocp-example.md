# Open/Closed Principle (OCP) - Pseudo-Code Example

## Correct Implementation

Extensible without modification using interfaces and polymorphism:

```pseudo
// Define interface for extension point
interface NotificationChannel {
  function send(message, recipient)
}

// Concrete implementations
class EmailNotification implements NotificationChannel {
  function send(message, recipient) {
    // Email implementation
  }
}

class SmsNotification implements NotificationChannel {
  function send(message, recipient) {
    // SMS implementation
  }
}

class NotificationService {
  channels = []

  constructor(channels) {
    this.channels = channels
  }

  function notify(message, recipient) {
    for each channel in channels {
      channel.send(message, recipient)
    }
  }
}

// Adding push notification requires NO modification to existing code
class PushNotification implements NotificationChannel {
  function send(message, recipient) {
    // Push notification implementation
  }
}
```

## Incorrect Implementation

Requires modification for each new feature:

```pseudo
// Class that must be modified for each new feature
class NotificationService {
  function notify(message, recipient, type) {
    if (type == "email") {
      // Email logic
    } else if (type == "sms") {
      // SMS logic
    }
    // Adding push notification requires modifying this method
  }
}
```

## Why the Incorrect Version is Bad

1. **Violates OCP**: Every new notification type requires modifying the `notify()` method
2. **Maintenance Burden**: Growing if/else chain becomes harder to manage
3. **Testing Complexity**: Must re-test entire method when adding new types
4. **Fragile Code**: Changes can break existing functionality
5. **Poor Scalability**: Difficult to add features without touching core code

## Checklist

- [ ] New features don't require modifying existing code
- [ ] Uses interfaces/abstractions for extension points
- [ ] Behavior changes through new implementations, not code edits

## Key Takeaways

- Use interfaces to define extension points
- Add new features by creating new classes, not modifying existing ones
- Dependency injection enables open/closed behavior
- Avoid if/else or switch statements that grow with new features
