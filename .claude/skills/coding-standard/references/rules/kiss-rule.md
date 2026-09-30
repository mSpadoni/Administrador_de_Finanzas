# KISS - Keep It Simple, Stupid

## Rule

Simplicity is the ultimate sophistication. **Must** choose the simplest solution that solves the problem.

## Scope

**All languages** - This principle applies universally to software design and problem-solving.

## When to Apply

- Simple requirements don't need complex solutions
- Straightforward logic should stay straightforward
- When tempted to use design patterns "just in case"
- Avoiding over-engineering
- When readability matters more than cleverness
- Default approach to all coding tasks unless complexity is justified

## Benefits

1. **Easier to Understand**: Simple code is readable by everyone
2. **Faster Development**: Less time spent on unnecessary complexity
3. **Fewer Bugs**: Less code means fewer places for bugs to hide
4. **Easier Maintenance**: Simple code is easier to modify
5. **Better Onboarding**: New team members can understand quickly
6. **Lower Cost**: Less code to write, test, and maintain

## How to Apply

1. **Start Simple**: Begin with the most straightforward solution
2. **Avoid Premature Abstraction**: Don't create abstractions before they're needed
3. **Question Complexity**: Ask "Is this complexity necessary?"
4. **Refactor When Needed**: Add complexity only when requirements demand it
5. **Value Readability**: Choose clarity over cleverness
6. **Resist Pattern Temptation**: Don't use design patterns for simple problems

## Checklist

- [ ] Solution is as simple as possible (but no simpler)
- [ ] No unnecessary abstractions or patterns
- [ ] Code is easy to understand at first glance
- [ ] No premature optimization
- [ ] Can explain the solution in simple terms
- [ ] Didn't use a design pattern just to use one

## Common Violations

- ❌ Using complex design patterns for simple tasks
- ❌ Creating abstractions before you need them
- ❌ Over-engineering straightforward logic
- ❌ Prioritizing "clever" code over readable code
- ❌ Adding layers of indirection without clear benefit
- ❌ Building generic solutions for specific problems

## Conflict Resolution

**KISS vs DRY**: Prefer KISS. It's better to have simple duplicated code than complex abstraction.

**KISS vs SOLID**: Apply SOLID only when complexity is justified. Don't force SOLID on simple problems.

## See Examples

See examples in [examples/kiss-example.md](../pseudo-examples/kiss-example.md)
