# DRY - Don't Repeat Yourself - Pseudo-Code Example

## Correct Implementation

Meaningful abstraction after Rule of Three:

```pseudo
// Meaningful abstraction after seeing pattern 3+ times
class DateFormatter {
  function formatToISO(date) {
    return date.toISOString()
  }

  function formatToDisplay(date) {
    return date.toLocaleDateString()
  }

  function formatToRelative(date) {
    now = currentDate()
    diff = now - date
    days = floor(diff / daysInMilliseconds)

    if (days == 0) return "Today"
    if (days == 1) return "Yesterday"
    return days + " days ago"
  }
}

// Used in 3+ places
isoDate = dateFormatter.formatToISO(user.createdAt)
```

## Incorrect Implementations

### Bad: Premature Abstraction

```pseudo
// Don't abstract after seeing duplication just ONCE
// Wait for the Rule of Three (3 occurrences)
```

### Bad: Wrong Abstraction

```pseudo
// Forcing unrelated code into one function
class StringHelper {
  function doSomething(str, num, bool) {
    // Forcing unrelated logic together
  }
}
```

## Why the Incorrect Version is Bad

1. **Premature Abstraction**: Creates complexity before patterns are clear
2. **Wrong Abstraction**: Worse than duplication
3. **Unclear Intent**: Generic functions hide what code actually does
4. **Hard to Modify**: Wrong abstraction makes changes harder
5. **Coupled Code**: Forces unrelated concepts together

## Checklist

- [ ] Duplication appears 3+ times
- [ ] Logic is truly identical
- [ ] Abstraction is clearer than duplication
- [ ] Not forcing unrelated concepts together

## Key Takeaways

- Wait for Rule of Three: Don't abstract until 3+ occurrences
- Wrong abstraction is worse than duplication
- Clear, specific functions beat "flexible" functions with boolean flags
- Prefer duplication over the wrong abstraction
