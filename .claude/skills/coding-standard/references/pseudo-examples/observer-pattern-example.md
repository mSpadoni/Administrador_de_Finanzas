# Observer Pattern - Pseudo-Code Example

## Correct Implementation

Observer pattern with subject and observers:

```pseudo
// Subject
class Subject {
  observers = []

  function attach(observer) {
    add observer to observers
  }

  function detach(observer) {
    remove observer from observers
  }

  function notify(data) {
    for each observer in observers {
      observer.update(data)
    }
  }
}

// Observer interface
class Observer {
  function update(data) {
    print("Received update: " + data)
  }
}

// Concrete observers
class Logger extends Observer {
  function update(data) {
    log("Data changed: " + data)
  }
}

class Analytics extends Observer {
  function update(data) {
    track("data_update", data)
  }
}

// Usage
subject = new Subject()
logger = new Logger()
analytics = new Analytics()

subject.attach(logger)
subject.attach(analytics)
subject.notify({event: "data_changed"})
```

## Incorrect Implementation

Tight coupling and no observer pattern:

```pseudo
// Direct dependencies and tight coupling
class DataStore {
  data = {}
  logger
  analytics
  notifier

  constructor() {
    // Hard-coded dependencies
    logger = new Logger()
    analytics = new Analytics()
    notifier = new Notifier()
  }

  function updateData(key, value) {
    data[key] = value

    // Tightly coupled notification logic
    logger.log("Data updated: " + key)
    analytics.track("data_update", {key, value})
    notifier.sendNotification("Data changed: " + key)

    // Hard to add new observers or remove existing ones
  }
}
```

## Why the Incorrect Version is Bad

1. **Tight Coupling**: DataStore directly depends on Logger, Analytics, and Notifier
2. **Violates Open/Closed**: Can't add new observers without modifying DataStore
3. **Not Flexible**: Can't remove or disable observers at runtime
4. **Hard to Test**: Must mock all dependencies even when testing one aspect
5. **Single Responsibility Violation**: DataStore handles both data and notification
6. **No Dynamic Behavior**: Can't add/remove observers based on runtime conditions

## Checklist

- [ ] Observers can attach/detach dynamically
- [ ] Subject doesn't know specific observer types
- [ ] Observers implement common update interface
- [ ] Easy to add new observers without modifying subject

## Key Takeaways

- Use observer pattern to decouple subject from observers
- Provide attach/detach methods for dynamic observer management
- Observers implement common interface (update method)
- Subject doesn't need to know observer types
- Easy to add new observers without modifying subject
- Prevents tight coupling and improves testability
