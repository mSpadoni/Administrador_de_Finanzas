# Repository Pattern

## Rule

Abstract data access logic into a repository layer. Provide a collection-like interface for accessing domain objects while hiding the details of data storage and retrieval.

## When to Apply

- When you want to decouple business logic from data access
- When you need to centralize data access logic
- When you want to switch between different data sources
- When implementing Domain-Driven Design
- When you need testable data access layer
- When you want to hide complex queries from business logic
- When multiple data sources need to be aggregated

## Benefits

- **Separation of Concerns**: Business logic separated from data access
- **Testability**: Easy to mock repository for unit tests
- **Maintainability**: Centralized data access logic
- **Flexibility**: Can switch data sources without changing business logic
- **Consistency**: Standardized data access interface
- **Single Responsibility**: Repository handles only data access
- **Abstraction**: Hides database implementation details

## How to Apply

1. **Repository Interface**: Define interface with data access methods
2. **Domain Objects**: Define entities that repository manages
3. **Concrete Repository**: Implement interface for specific data source
4. **Dependency Injection**: Inject repository into services
5. **Collection Interface**: Provide methods like find, findAll, save, delete

## Checklist

- [ ] Repository interface defines data access contract
- [ ] Repository works with domain entities, not database models
- [ ] Concrete repository implements the interface
- [ ] Business logic depends on interface, not implementation
- [ ] Repository provides collection-like interface (find, save, delete)
- [ ] Complex queries encapsulated in repository methods
- [ ] Repository is easily mockable for testing

## Common Use Cases

| Use Case              | Example                                                  |
| --------------------- | -------------------------------------------------------- |
| **User Management**   | UserRepository with findById, findAll, save, delete      |
| **Product Catalog**   | ProductRepository with search, filtering methods         |
| **Order Processing**  | OrderRepository with findByCustomer, findByDate          |
| **Multi-Source Data** | Aggregate data from database, cache, API                 |
| **Testing**           | Mock repository for unit tests                           |
| **Data Migration**    | Switch from SQL to NoSQL without changing business logic |

## Standard Methods

Common repository methods:

- `findById(id)` - Find entity by ID
- `findAll()` - Get all entities
- `save(entity)` - Create or update entity
- `delete(id)` - Delete entity by ID
- `exists(id)` - Check if entity exists
- Custom queries specific to domain

## Variations

- **Generic Repository**: Base repository with common CRUD operations
- **Specification Pattern**: Combine with specification for complex queries
- **Unit of Work**: Coordinate multiple repositories in transactions

## See Examples

See examples in [examples/repository-pattern-example.md](../pseudo-examples/repository-pattern-example.md)
