# Java Patterns

Reference guide for common Java architectural and language patterns.

## Spring Boot Layers

- **Controller** (`@RestController`) — HTTP routing, request binding, response serialization
- **Service** (`@Service`) — business logic, transaction boundaries
- **Repository** (`@Repository`) — data access, JPA queries
- **Entity** (`@Entity`) — domain model, JPA annotations

Constructor injection is preferred over field injection:

```java
@RestController
@RequestMapping("/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }
}
```

## JPA/Hibernate

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
```

Use `@Transactional` at the service layer for write operations.

## Stream API

```java
List<String> emails = users.stream()
    .filter(User::isActive)
    .map(User::getEmail)
    .collect(Collectors.toList());
```

## Optional

```java
Optional.ofNullable(value)
    .orElseThrow(() -> new NotFoundException("User not found"));
```

## Records (Java 16+)

```java
record UserDto(String name, String email) {}
```

Auto-generates: constructor, getters (`name()`, `email()`), `equals`, `hashCode`, `toString`.

## Sealed Interfaces (Java 17+)

```java
sealed interface PaymentMethod permits CreditCard, PayPal, BankTransfer {}
final class CreditCard implements PaymentMethod {}
```

Enables exhaustive pattern matching in `switch` expressions.
