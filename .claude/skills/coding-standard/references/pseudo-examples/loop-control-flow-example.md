# Loop Control Flow - Pseudo-Code Example

## Correct Implementation

Using appropriate loop constructs:

```pseudo
// Use plain loop when break/continue is needed
function findFirstValid(items) {
  for each item in items {
    if (item.skip) continue
    if (item.isValid) return item
  }
  return null
}

function processUntilError(items) {
  for each item in items {
    if (item.hasError) break
    process(item)
  }
}

// Use declarative methods when no control flow needed
activeUsers = users.filter(user => user.isActive)

userNames = users.map(user => user.name)

total = items.reduce((sum, item) => sum + item.price, 0)

// Chaining declarative methods
processedItems = items
  .filter(item => !item.skip)
  .map(item => transform(item))
  .filter(item => item.isValid)

// Use for-of for simple iteration
for each user in users {
  sendEmail(user.email)
}

// Use traditional for when index is needed
for i from 0 to items.length {
  if (i > 0 AND items[i].dependsOn(items[i-1])) {
    process(items[i], items[i-1])
  }
}
```

## Incorrect Implementation

Using wrong loop construct:

```pseudo
// Using forEach when break/continue is needed
items.forEach(item => {
  if (item.skip) return  // This is continue, but unclear
  if (item.error) {
    // Cannot break from forEach!
  }
  process(item)
})

// Manual loop when declarative would be clearer
activeUsers = []
for each user in users {
  if (user.isActive) {
    activeUsers.push(user)
  }
}

// Manual loop for transformation
userNames = []
for each user in users {
  userNames.push(user.name)
}

// Manual accumulation
total = 0
for each item in items {
  total = total + item.price
}
```

## Why the Incorrect Version is Bad

1. **Unclear Intent**: Using forEach suggests functional style but has side effects
2. **Cannot Break**: forEach doesn't support break, forcing workarounds
3. **Less Readable**: Manual loops are verbose for simple transformations
4. **Error Prone**: Manual index tracking can cause bugs
5. **Not Idiomatic**: Declarative methods are standard for transformations

## Checklist

- [ ] Use for/while/for-of when break/continue is needed
- [ ] Use map/filter/reduce for transformations
- [ ] Avoid forEach (use for-of or declarative methods)
- [ ] Use find for first match
- [ ] Use some/every for boolean checks

## Key Takeaways

- Use plain loops (for/while/for-of) when you need break/continue
- Use declarative methods (map/filter/reduce) for transformations
- forEach is rarely the right choice - use for-of or declarative methods instead
- Declarative code is more readable and less error-prone
- Choose the construct that best expresses your intent
