# Single Responsibility Functions - Pseudo-Code Example

## Correct Implementation

Functions focused on a single task:

```pseudo
// Each function has one responsibility
function validateEmail(email) {
  return email matches email pattern
}

function createWelcomeMessage(name) {
  return "Welcome to our platform, " + name + "!"
}

function sendEmail(email, message) {
  // Email sending logic only
  emailClient.send(email, message)
}

function sendWelcomeEmail(email, name) {
  message = createWelcomeMessage(name)
  sendEmail(email, message)
}

// Separate validation concerns
function validatePassword(password) {
  return password.length >= 8
}

function validateUsername(username) {
  return username.length >= 3 AND username matches alphanumeric
}

function validateUserData(data) {
  errors = []

  if (!validateEmail(data.email)) {
    add "Invalid email" to errors
  }

  if (!validatePassword(data.password)) {
    add "Password must be at least 8 characters" to errors
  }

  if (!validateUsername(data.username)) {
    add "Invalid username" to errors
  }

  return {isValid: errors.length == 0, errors}
}
```

## Incorrect Implementation

Functions with multiple responsibilities:

```pseudo
// Multiple responsibilities in one function
function processUser(email, data) {
  // Responsibility 1: Email validation
  if (email not matches email pattern) {
    throw Error("Invalid email")
  }

  // Responsibility 2: Password validation
  if (data.password.length < 8) {
    throw Error("Password too short")
  }

  // Responsibility 3: Database persistence
  database.save({
    email: email,
    password: data.password,
    createdAt: currentDate()
  })

  // Responsibility 4: Email notification
  message = "Welcome!"
  emailClient.send(email, message)

  // Responsibility 5: Logging
  log("User processed: " + email)

  // Responsibility 6: Analytics tracking
  analytics.track("user_created", {email})
}

// Doing too much
function handleUserRegistration(formData) {
  // Parsing form data
  email = formData.get("email")
  password = formData.get("password")

  // Validation
  if (!email OR !password) return {error: "Missing fields"}

  // Password hashing
  hashedPassword = bcrypt.hash(password, 10)

  // Database save
  user = database.insert({email, password: hashedPassword})

  // Send welcome email
  emailClient.send(email, "Welcome!")

  // Create session
  session = createSession(user.id)

  // Log activity
  logger.info("User registered", {userId: user.id})

  // Return response
  return {success: true, userId: user.id, session}
}
```

## Why the Incorrect Version is Bad

1. **Hard to Test**: Must mock database, email, logging, and analytics to test validation
2. **Poor Reusability**: Cannot reuse validation logic without database and email dependencies
3. **Difficult to Maintain**: Changes to any responsibility require modifying this function
4. **Unclear Purpose**: Function name doesn't convey all the things it does
5. **Tight Coupling**: Function depends on too many unrelated services

## Refactoring to Single Responsibility

```pseudo
// Before: Multiple responsibilities
function processOrder(orderId) {
  order = database.getOrder(orderId)
  if (!order) return false

  valid = order.items.length > 0 AND order.total > 0
  if (!valid) return false

  payment = processPayment(order.total)
  if (!payment.success) return false

  database.updateOrder(orderId, {status: "paid"})
  emailClient.send(order.customerEmail, "Order confirmed")
  logger.info("Order processed", {orderId})

  return true
}

// After: Single responsibility per function
function getOrder(orderId) {
  return database.getOrder(orderId)
}

function validateOrder(order) {
  return order.items.length > 0 AND order.total > 0
}

function chargeOrder(order) {
  return processPayment(order.total)
}

function markOrderAsPaid(orderId) {
  database.updateOrder(orderId, {status: "paid"})
}

function sendOrderConfirmation(order) {
  emailClient.send(order.customerEmail, "Order confirmed")
}

function logOrderProcessed(orderId) {
  logger.info("Order processed", {orderId})
}

// Orchestrator function composing single-responsibility functions
function processOrder(orderId) {
  order = getOrder(orderId)
  if (!order) return false

  if (!validateOrder(order)) return false

  payment = chargeOrder(order)
  if (!payment.success) return false

  markOrderAsPaid(orderId)
  sendOrderConfirmation(order)
  logOrderProcessed(orderId)

  return true
}
```

## Checklist

- [ ] Function name clearly describes its single purpose
- [ ] No "and" or "or" needed to describe what function does
- [ ] Function is short (typically < 20 lines)
- [ ] All code relates to the same concern
- [ ] Easy to write a single, focused unit test

## Key Takeaways

- Each function must do one thing and do it well
- Break complex functions into smaller, focused functions
- Use composition to build complex behaviors from simple functions
- Single responsibility makes code easier to test, understand, and maintain
- If you need "and" to describe a function, it likely has multiple responsibilities
