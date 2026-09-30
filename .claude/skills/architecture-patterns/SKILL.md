---
name: architecture-patterns
description: |
  Implement proven backend architecture patterns including Clean Architecture, Hexagonal Architecture, and Domain-Driven Design. Use when: (1) Designing new backend systems from scratch, (2) Refactoring monolithic applications for better maintainability, (3) Establishing architecture standards for teams, (4) Migrating from tightly coupled to loosely coupled architectures, (5) Implementing domain-driven design principles, (6) Creating testable and mockable codebases, (7) Planning microservices decomposition, (8) Choosing between design patterns like MVC, microservices, etc.
---

# Architecture Patterns

Guidance for implementing Clean Architecture, Hexagonal Architecture, and Domain-Driven Design to build maintainable, testable, and scalable systems.

## Core Concepts

### 1. Clean Architecture (Uncle Bob)

**Layers (dependency flows inward):**

- **Entities**: Core business models
- **Use Cases**: Application business rules
- **Interface Adapters**: Controllers, presenters, gateways
- **Frameworks & Drivers**: UI, database, external services

**Key Principles:**

- Dependencies point inward
- Inner layers know nothing about outer layers
- Business logic independent of frameworks
- Testable without UI, database, or external services

### 2. Hexagonal Architecture (Ports and Adapters)

**Components:**

- **Domain Core**: Business logic
- **Ports**: Interfaces defining interactions
- **Adapters**: Implementations of ports (database, REST, message queue)

**Benefits:**

- Swap implementations easily (mock for testing)
- Technology-agnostic core
- Clear separation of concerns

### 3. Domain-Driven Design (DDD)

**Strategic Patterns:**

- **Bounded Contexts**: Separate models for different domains
- **Context Mapping**: How contexts relate
- **Ubiquitous Language**: Shared terminology

**Tactical Patterns:**

- **Entities**: Objects with identity
- **Value Objects**: Immutable objects defined by attributes
- **Aggregates**: Consistency boundaries
- **Repositories**: Data access abstraction
- **Domain Events**: Things that happened

## Clean Architecture Pattern

### Directory Structure

```
app/
├── domain/           # Entities & business rules
│   ├── entities/
│   ├── value_objects/
│   └── interfaces/   # Abstract interfaces
├── use_cases/        # Application business rules
├── adapters/         # Interface implementations
│   ├── repositories/
│   ├── controllers/
│   └── gateways/
└── infrastructure/   # Framework & external concerns
```

### Implementation Pattern

```pseudo
# domain/entities/User
ENTITY User:
    PROPERTIES:
        id: String
        email: String
        name: String
        created_at: DateTime
        is_active: Boolean = true

    METHOD deactivate():
        SET is_active = false

    METHOD can_place_order() -> Boolean:
        RETURN is_active

# domain/interfaces/UserRepository
INTERFACE UserRepository:
    METHOD find_by_id(user_id: String) -> User OR NULL
    METHOD find_by_email(email: String) -> User OR NULL
    METHOD save(user: User) -> User
    METHOD delete(user_id: String) -> Boolean

# use_cases/CreateUser
DATA CreateUserRequest:
    email: String
    name: String

DATA CreateUserResponse:
    user: User
    success: Boolean
    error: String OR NULL

CLASS CreateUserUseCase:
    CONSTRUCTOR(user_repository: UserRepository):
        STORE user_repository

    METHOD execute(request: CreateUserRequest) -> CreateUserResponse:
        # Business validation
        existing = CALL user_repository.find_by_email(request.email)
        IF existing EXISTS:
            RETURN CreateUserResponse(user=NULL, success=false, error="Email already exists")

        # Create entity
        user = NEW User(
            id=GENERATE_UUID(),
            email=request.email,
            name=request.name,
            created_at=NOW(),
            is_active=true
        )

        # Persist
        saved_user = CALL user_repository.save(user)

        RETURN CreateUserResponse(user=saved_user, success=true)

# adapters/repositories/DatabaseUserRepository
CLASS DatabaseUserRepository IMPLEMENTS UserRepository:
    CONSTRUCTOR(database_connection):
        STORE database_connection

    METHOD find_by_id(user_id: String) -> User OR NULL:
        row = QUERY database "SELECT * FROM users WHERE id = ?" WITH user_id
        RETURN map_to_entity(row) IF row EXISTS ELSE NULL

    METHOD find_by_email(email: String) -> User OR NULL:
        row = QUERY database "SELECT * FROM users WHERE email = ?" WITH email
        RETURN map_to_entity(row) IF row EXISTS ELSE NULL

    METHOD save(user: User) -> User:
        EXECUTE database "INSERT OR UPDATE users SET ..." WITH user fields
        RETURN user

    METHOD delete(user_id: String) -> Boolean:
        result = EXECUTE database "DELETE FROM users WHERE id = ?" WITH user_id
        RETURN result.affected_rows == 1

# adapters/controllers/UserController
CONTROLLER UserController:
    ENDPOINT POST "/users":
        INPUT: dto (email, name)

        request = NEW CreateUserRequest(email=dto.email, name=dto.name)
        response = CALL create_user_use_case.execute(request)

        IF NOT response.success:
            RETURN HTTP 400 WITH response.error

        RETURN HTTP 200 WITH response.user
```

## Hexagonal Architecture Pattern

```pseudo
# Core domain (hexagon center)
CLASS OrderService:
    CONSTRUCTOR(
        order_repository: OrderRepositoryPort,
        payment_gateway: PaymentGatewayPort,
        notification_service: NotificationPort
    ):
        STORE all ports

    METHOD place_order(order: Order) -> OrderResult:
        # Business logic
        IF NOT order.is_valid():
            RETURN OrderResult(success=false, error="Invalid order")

        # Use ports (interfaces)
        payment = CALL payment_gateway.charge(
            amount=order.total,
            customer=order.customer_id
        )

        IF NOT payment.success:
            RETURN OrderResult(success=false, error="Payment failed")

        CALL order.mark_as_paid()
        saved_order = CALL order_repository.save(order)

        CALL notification_service.send(
            to=order.customer_email,
            subject="Order confirmed",
            body="Order " + order.id + " confirmed"
        )

        RETURN OrderResult(success=true, order=saved_order)

# Ports (interfaces)
INTERFACE OrderRepositoryPort:
    METHOD save(order: Order) -> Order

INTERFACE PaymentGatewayPort:
    METHOD charge(amount: Money, customer: String) -> PaymentResult

INTERFACE NotificationPort:
    METHOD send(to: String, subject: String, body: String)

# Adapters (implementations)
CLASS StripePaymentAdapter IMPLEMENTS PaymentGatewayPort:
    CONSTRUCTOR(api_key: String):
        CONFIGURE stripe WITH api_key

    METHOD charge(amount: Money, customer: String) -> PaymentResult:
        TRY:
            charge = CALL stripe.Charge.create(
                amount=amount.cents,
                currency=amount.currency,
                customer=customer
            )
            RETURN PaymentResult(success=true, transaction_id=charge.id)
        CATCH card_error:
            RETURN PaymentResult(success=false, error=card_error.message)

CLASS MockPaymentAdapter IMPLEMENTS PaymentGatewayPort:
    # Test adapter: no external dependencies
    METHOD charge(amount: Money, customer: String) -> PaymentResult:
        RETURN PaymentResult(success=true, transaction_id="mock-123")
```

## Domain-Driven Design Pattern

```pseudo
# Value Objects (immutable)
VALUE_OBJECT Email:
    PROPERTY value: String

    ON_CREATE:
        IF "@" NOT IN value:
            THROW "Invalid email"

VALUE_OBJECT Money:
    PROPERTIES:
        amount: Integer  # cents
        currency: String

    METHOD add(other: Money) -> Money:
        IF currency != other.currency:
            THROW "Currency mismatch"
        RETURN NEW Money(amount + other.amount, currency)

# Entities (with identity)
ENTITY Order:
    PROPERTIES:
        id: String
        customer: Customer
        items: List<OrderItem> = []
        status: OrderStatus = PENDING
        _events: List<DomainEvent> = []

    METHOD add_item(product: Product, quantity: Integer):
        item = NEW OrderItem(product, quantity)
        APPEND item TO items
        APPEND ItemAddedEvent(id, item) TO _events

    METHOD total() -> Money:
        RETURN SUM OF item.subtotal() FOR EACH item IN items

    METHOD submit():
        IF items IS EMPTY:
            THROW "Cannot submit empty order"
        IF status != PENDING:
            THROW "Order already submitted"

        SET status = SUBMITTED
        APPEND OrderSubmittedEvent(id) TO _events

# Aggregates (consistency boundary)
AGGREGATE Customer:
    PROPERTIES:
        id: String
        email: Email
        _addresses: List<Address> = []
        _orders: List<String> = []  # Order IDs, not full objects

    METHOD add_address(address: Address):
        IF LENGTH(_addresses) >= 5:
            THROW "Maximum 5 addresses allowed"
        APPEND address TO _addresses

    PROPERTY primary_address -> Address OR NULL:
        RETURN FIRST address IN _addresses WHERE address.is_primary

# Domain Events
EVENT OrderSubmittedEvent:
    order_id: String
    occurred_at: DateTime = NOW()

# Repository (aggregate persistence)
REPOSITORY OrderRepository:
    METHOD find_by_id(order_id: String) -> Order OR NULL:
        # Reconstitute aggregate from storage

    METHOD save(order: Order):
        CALL _persist(order)
        CALL _publish_events(order._events)
        CLEAR order._events
```

## Best Practices

1. **Dependency Rule**: Dependencies always point inward
2. **Interface Segregation**: Small, focused interfaces
3. **Business Logic in Domain**: Keep frameworks out of core
4. **Test Independence**: Core testable without infrastructure
5. **Bounded Contexts**: Clear domain boundaries
6. **Ubiquitous Language**: Consistent terminology
7. **Thin Controllers**: Delegate to use cases
8. **Rich Domain Models**: Behavior with data

## Common Pitfalls

- **Anemic Domain**: Entities with only data, no behavior
- **Framework Coupling**: Business logic depends on frameworks
- **Fat Controllers**: Business logic in controllers
- **Repository Leakage**: Exposing ORM objects
- **Missing Abstractions**: Concrete dependencies in core
- **Over-Engineering**: Clean architecture for simple CRUD
