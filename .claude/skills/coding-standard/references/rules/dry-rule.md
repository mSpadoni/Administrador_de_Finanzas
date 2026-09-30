# DRY - Don't Repeat Yourself

## Rule

**Must** apply abstraction after seeing duplication 3 times (Rule of Three). Every piece of knowledge **must** have a single, authoritative representation.

## Scope

**All languages** - This principle applies universally to code organization and knowledge representation.

## When to Apply

- Same code appears 3+ times (Rule of Three)
- Logic is truly identical, not just similar
- Abstraction makes code clearer, not more complex
- Change in one place should affect all uses
- Business rule exists in multiple locations

## When NOT to Apply

- Code appears only 1-2 times (wait for third occurrence)
- Code looks similar but represents different concepts
- Duplication is better than wrong abstraction
- Abstraction adds more complexity than it removes
- Similar code in different bounded contexts

## Benefits

1. **Single Source of Truth**: Changes happen in one place
2. **Easier Maintenance**: Fix bugs or update logic once
3. **Consistency**: Same behavior everywhere
4. **Reduced Errors**: No risk of forgetting to update all copies
5. **Better Understanding**: Clear where logic lives

## How to Apply

1. **Wait for Rule of Three**: Don't abstract on first or second duplication
2. **Verify True Duplication**: Ensure logic is truly identical
3. **Create Meaningful Abstraction**: Name should clearly communicate purpose
4. **Ensure Clarity**: Abstraction must be clearer than duplication
5. **Avoid Forcing**: Don't force unrelated code into one function

## Checklist

- [ ] Duplication appears 3+ times
- [ ] Logic is truly identical, not just similar
- [ ] Abstraction is clearer than duplication
- [ ] Not forcing unrelated concepts together
- [ ] Abstraction has a clear, meaningful name
- [ ] All occurrences truly represent the same concept

## Common Violations

- ❌ Abstracting after only 1-2 occurrences (premature abstraction)
- ❌ Forcing similar-but-different code into one function
- ❌ Creating "utility" functions with boolean flags
- ❌ Wrong abstraction is worse than duplication
- ❌ Coupling unrelated code because it "looks similar"

## Conflict Resolution

**DRY vs KISS**: Prefer KISS. Apply DRY only after Rule of Three.

**DRY vs YAGNI**: Apply YAGNI first. Don't abstract for hypothetical future cases.

## See Examples

See examples in [examples/dry-example.md](../pseudo-examples/dry-example.md)
