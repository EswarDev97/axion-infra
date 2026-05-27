# Java Testing

Reference guide for testing Java code with JUnit 5 and Spring.

## JUnit 5 Basics

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository repo;
    @InjectMocks UserService service;

    @Test
    void returnsUserWhenFound() {
        when(repo.findById(1L)).thenReturn(Optional.of(new User(1L, "Alice")));
        User result = service.getUser(1L);
        assertThat(result.getName()).isEqualTo("Alice");
    }
}
```

## Mockito

```java
verify(repo, times(1)).save(any(User.class));
doThrow(new RuntimeException()).when(repo).delete(anyLong());
```

## Spring Boot Slices

Use slice tests to load only the relevant layer:

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mvc;
    @MockBean UserService service;

    @Test
    void getUser_returns200() throws Exception {
        when(service.getUser(1L)).thenReturn(new User(1L, "Alice"));
        mvc.perform(get("/users/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Alice"));
    }
}
```

## TestContainers

```java
@Container
static PostgreSQLContainer<?> postgres =
    new PostgreSQLContainer<>("postgres:15");

@DynamicPropertySource
static void configureProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
}
```

## AssertJ

```java
assertThat(result)
    .isNotNull()
    .extracting(User::getName)
    .isEqualTo("Alice");

assertThatThrownBy(() -> service.getUser(-1L))
    .isInstanceOf(NotFoundException.class)
    .hasMessageContaining("not found");
```
