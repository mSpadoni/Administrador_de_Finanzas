# YAGNI - You Aren't Gonna Need It - Pseudo-Code Example

## Correct Implementation

Build only what's needed right now:

```pseudo
// Build only what's needed NOW
class UserService {
  repository

  constructor(repository) {
    this.repository = repository
  }

  function createUser(dto) {
    return repository.save(new User(dto))
  }
}

// When batch creation is actually needed, THEN add it
```

## Incorrect Implementation

Building for imaginary future needs:

```pseudo
// Building for imaginary future needs
class UserService {
  // We don't need these yet!

  function createUser(dto) { }

  function createUserBatch(dtos) { }

  function createUserWithRetry(dto, maxRetries) { }

  function createUserAsync(dto) { }

  function createUserWithCallback(dto, callback) { }

  function createUserWithHooks(dto, hooks) { }
}
```

## Why the Incorrect Version is Bad

1. **Wasted Effort**: Time spent on features that may never be needed
2. **Increased Complexity**: More code to understand, test, and maintain
3. **More Bugs**: Unused code can still have bugs
4. **Harder to Change**: Extra code makes refactoring harder
5. **Wrong Abstractions**: Guessing future needs leads to poor designs

## Checklist

- [ ] Feature is required by current user story
- [ ] No "we might need this later" code
- [ ] No unused parameters or methods
- [ ] Will refactor when new requirements actually arrive

## Key Takeaways

- Build only what current requirements demand
- Don't add features "just in case"
- Trust that you can refactor when requirements arrive
- Real requirements lead to better design than speculation
