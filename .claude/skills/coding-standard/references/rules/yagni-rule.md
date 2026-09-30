# YAGNI - You Aren't Gonna Need It

## Rule

**Must** build only what is needed right now. **Must not** implement features or abstractions for hypothetical future needs.

## Scope

**All languages** - This principle applies universally to software development and feature planning.

## When to Apply

- Feature is not in current requirements or user stories
- Facing "we might need this later" scenarios
- Considering adding unused parameters, methods, or classes
- Tempted to build generic solutions for specific problems
- Planning features before they're requested
- Adding configurability that isn't currently needed

## Benefits

1. **Faster Delivery**: Ship features faster by focusing on current needs
2. **Less Code**: Fewer lines means fewer bugs and less maintenance
3. **Lower Complexity**: Simpler codebase without speculative features
4. **Easier Changes**: Refactor when you know actual requirements
5. **Reduced Waste**: Don't spend time on features that may never be used
6. **Better Design**: Real requirements lead to better abstractions than guesses

## How to Apply

1. **Check Requirements**: Is this feature in the current specification?
2. **Resist Future-Proofing**: Don't build for imaginary future scenarios
3. **Remove Unused Code**: Delete unused parameters, methods, and classes
4. **Refactor Later**: Wait for actual requirements before generalizing
5. **Question Every Feature**: Ask "Do we need this NOW?"
6. **Trust Refactoring**: Believe you can add complexity when it's needed

## Checklist

- [ ] Feature is required by current user story or requirement
- [ ] No "we might need this later" code
- [ ] No unused parameters or methods
- [ ] Will refactor when new requirements actually arrive
- [ ] Not building generic solution for specific problem
- [ ] Every method/class has a current, concrete use case

## Common Violations

- ❌ Adding batch operations when only single operations are needed
- ❌ Building async versions before async is required
- ❌ Adding retry logic when failures haven't occurred
- ❌ Creating hooks/callbacks for future extensibility
- ❌ Implementing multiple output formats when only one is needed
- ❌ Adding configuration options that aren't currently used

## Conflict Resolution

**YAGNI vs Future-Proofing**: Choose YAGNI. Refactor when requirements change.

**YAGNI vs DRY**: Apply YAGNI first. Wait for Rule of Three before abstracting.

## See Examples

See examples in [examples/yagni-example.md](../pseudo-examples/yagni-example.md)
