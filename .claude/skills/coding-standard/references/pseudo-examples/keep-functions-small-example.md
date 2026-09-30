# Keep Functions Small - Pseudo-Code Example

## Correct Implementation

Small, focused functions:

```pseudo
// Small functions with single purpose
function validateEmail(email) {
  return email contains "@"
}

function validatePassword(password) {
  return password.length >= 8
}

function validateUser(user) {
  errors = []

  if (!validateEmail(user.email)) {
    add "Invalid email" to errors
  }

  if (!validatePassword(user.password)) {
    add "Password too short" to errors
  }

  return {isValid: errors.length == 0, errors}
}

function createUser(data) {
  validation = validateUser(data)
  if (!validation.isValid) {
    throw Error(validation.errors.join(", "))
  }

  user = {
    id: generateId(),
    email: data.email,
    password: hashPassword(data.password),
    createdAt: currentDate()
  }

  return user
}
```

## Incorrect Implementation

Large function doing too much:

```pseudo
// Large function with multiple responsibilities
function processUserRegistration(formData) {
  // Parse form data (5 lines)
  email = formData.get("email")
  password = formData.get("password")
  name = formData.get("name")

  // Validation (10 lines)
  if (!email) return {error: "Missing email"}
  if (!password) return {error: "Missing password"}
  if (!email contains "@") return {error: "Invalid email"}
  if (password.length < 8) return {error: "Password too short"}

  // Check existing user (5 lines)
  existing = database.query("SELECT * FROM users WHERE email = ?", [email])
  if (existing) return {error: "Email already registered"}

  // Password hashing (3 lines)
  hashedPassword = bcrypt.hash(password, 10)

  // Database save (5 lines)
  user = database.insert({
    email: email,
    password: hashedPassword,
    name: name,
    createdAt: currentDate()
  })

  // Send welcome email (5 lines)
  emailHtml = buildWelcomeEmail(name)
  emailClient.send(email, "Welcome!", emailHtml)

  // Create session (3 lines)
  session = createSession(user.id)

  // Log activity (2 lines)
  logger.info("User registered", {userId: user.id})

  // Return response (2 lines)
  return {success: true, userId: user.id, session}
}
```

## Why the Incorrect Version is Bad

1. **Hard to Understand**: Too much code to read at once
2. **Hard to Test**: Must test many concerns together
3. **Poor Reusability**: Cannot reuse parts separately
4. **Difficult to Maintain**: Changes affect large function
5. **Hard to Name**: Function does too much to have clear name

## Checklist

- [ ] Functions are typically under 20 lines
- [ ] Each function has single responsibility
- [ ] Function name clearly describes what it does
- [ ] Easy to understand at a glance
- [ ] Can be tested independently

## Key Takeaways

- Keep functions small (typically under 20 lines)
- Each function should do one thing
- Extract complex logic into separate functions
- Small functions are easier to understand, test, and maintain
- Use composition to build complex behaviors from small functions
