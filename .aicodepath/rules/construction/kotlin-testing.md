# Kotlin Testing

Reference guide for testing Kotlin code.

## JUnit 5 with Kotlin

```kotlin
class UserServiceTest {

    private val repo = mockk<UserRepository>()
    private val service = UserService(repo)

    @Test
    fun `returns user when found`() {
        every { repo.findById(1L) } returns User(1L, "Alice")
        val result = service.getUser(1L)
        assertThat(result.name).isEqualTo("Alice")
    }
}
```

## MockK

Kotlin-idiomatic mocking library:

```kotlin
val mock = mockk<PaymentService>()
every { mock.charge(any()) } returns PaymentResult.Success
verify(exactly = 1) { mock.charge(order) }
```

Use `coEvery` / `coVerify` for suspend functions:

```kotlin
coEvery { mock.fetchAsync(any()) } returns data
coVerify { mock.fetchAsync("id-1") }
```

## kotlinx-coroutines-test

Test coroutines with `runTest` (replaces `runBlocking` in tests):

```kotlin
@Test
fun `coroutine test`() = runTest {
    val result = service.fetchUser("1")
    assertThat(result).isNotNull()
}
```

Use `advanceTimeBy` and `TestCoroutineScheduler` to control virtual time.

## Turbine for Flow Testing

```kotlin
@Test
fun `emits values`() = runTest {
    service.userFlow().test {
        assertThat(awaitItem().name).isEqualTo("Alice")
        awaitComplete()
    }
}
```

## AssertJ + Kotlin

```kotlin
assertThat(result.name).isEqualTo("Alice")
assertThatThrownBy { service.getUser(-1L) }
    .isInstanceOf(NotFoundException::class.java)
```
