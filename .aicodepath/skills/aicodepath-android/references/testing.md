# Testing Patterns

NowInAndroid's philosophy: hand-crafted test doubles over mocking libraries.
No Mockito. No MockK. Interfaces + implementations + test hooks.

---

## Testing Philosophy

### Why no mocking libraries?
- Test doubles exercise real production code paths (the interface implementation)
- Mocks only verify call signatures — they don't break when behaviour changes
- Hand-crafted doubles are less brittle and easier to understand

### Test types

| Type | Location | Runner | What |
|------|----------|--------|------|
| Unit tests | `src/test/` | JVM | ViewModel, UseCase, Repository logic |
| UI tests | `src/androidTest/` | Device/Emulator | Compose screens, integration |
| Screenshot tests | `src/test/` | Robolectric + Roborazzi | Visual regression |

---

## Test Doubles

### Test Repository (in `core:testing`)

```kotlin
class TestTopicsRepository : TopicsRepository {

    // Flow sources with replay — tests push data via sendXxx()
    private val topicsFlow = MutableSharedFlow<List<Topic>>(replay = 1)

    fun sendTopics(topics: List<Topic>) {
        topicsFlow.tryEmit(topics)
    }

    override fun getTopics(): Flow<List<Topic>> = topicsFlow

    override fun getTopic(id: String): Flow<Topic> =
        topicsFlow.map { list -> list.first { it.id == id } }

    override suspend fun setTopicFollowed(topicId: String, followed: Boolean) {
        // No-op or update internal state as needed
    }

    override suspend fun syncWith(synchronizer: Synchronizer): Boolean = true
}
```

### Test DataStore (user preferences)

```kotlin
class TestUserDataRepository : UserDataRepository {

    private val _userData = MutableStateFlow(
        UserData(
            bookmarkedNewsResources = emptySet(),
            followedTopics = emptySet(),
            themeBrand = ThemeBrand.DEFAULT,
            darkThemeConfig = DarkThemeConfig.FOLLOW_SYSTEM,
            useDynamicColor = true,
        ),
    )

    override val userData: Flow<UserData> = _userData

    fun setUserData(data: UserData) { _userData.value = data }

    override suspend fun setNewsResourceBookmarked(id: String, bookmarked: Boolean) {
        _userData.update { it.copy(
            bookmarkedNewsResources = if (bookmarked) it.bookmarkedNewsResources + id
                                     else it.bookmarkedNewsResources - id
        ) }
    }

    override suspend fun setTopicFollowed(id: String, followed: Boolean) {
        _userData.update { it.copy(
            followedTopics = if (followed) it.followedTopics + id
                             else it.followedTopics - id
        ) }
    }
}
```

### Test Network DataSource

```kotlin
class TestNetworkDataSource : NiaNetworkDataSource {

    private var topicsResponse: List<NetworkTopic> = emptyList()
    private var newsResponse: List<NetworkNewsResource> = emptyList()

    fun setTopics(topics: List<NetworkTopic>) { topicsResponse = topics }
    fun setNews(news: List<NetworkNewsResource>) { newsResponse = news }

    override suspend fun getTopics(ids: List<String>?): List<NetworkTopic> =
        if (ids != null) topicsResponse.filter { it.id in ids } else topicsResponse

    override suspend fun getNewsResources(ids: List<String>?): List<NetworkNewsResource> =
        if (ids != null) newsResponse.filter { it.id in ids } else newsResponse
}
```

---

## ViewModel Unit Tests

```kotlin
class TopicViewModelTest {

    @get:Rule
    val dispatcherRule = TestDispatcherRule()

    private val topicsRepository = TestTopicsRepository()
    private val userDataRepository = TestUserDataRepository()

    private lateinit var viewModel: TopicViewModel

    @Before
    fun setup() {
        viewModel = TopicViewModel(
            savedStateHandle = SavedStateHandle(mapOf("id" to testTopic.id)),
            topicsRepository = topicsRepository,
            getUserNewsResourcesUseCase = GetUserNewsResourcesUseCase(
                newsRepository = TestNewsRepository(),
                userDataRepository = userDataRepository,
            ),
        )
    }

    @Test
    fun `initial state is Loading`() = runTest {
        assertEquals(TopicUiState.Loading, viewModel.uiState.value)
    }

    @Test
    fun `emits Success after data arrives`() = runTest {
        topicsRepository.sendTopics(listOf(testTopic))
        userDataRepository.setUserData(testUserData)

        val state = viewModel.uiState.filterIsInstance<TopicUiState.Success>().first()
        assertEquals(testTopic.id, state.topic.topic.id)
    }

    @Test
    fun `followTopic updates repository`() = runTest {
        topicsRepository.sendTopics(listOf(testTopic))
        userDataRepository.setUserData(testUserData.copy(followedTopics = emptySet()))

        viewModel.followTopic(true)

        val userData = userDataRepository.userData.first()
        assertTrue(testTopic.id in userData.followedTopics)
    }
}
```

### TestDispatcherRule

```kotlin
// core:testing — reuse across all ViewModel tests
class TestDispatcherRule(
    val testDispatcher: TestDispatcher = UnconfinedTestDispatcher(),
) : TestWatcher() {
    override fun starting(description: Description) = Dispatchers.setMain(testDispatcher)
    override fun finished(description: Description) = Dispatchers.resetMain()
}
```

### Testing StateFlow with Turbine

```kotlin
@Test
fun `state sequence is Loading then Success`() = runTest {
    viewModel.uiState.test {
        assertEquals(TopicUiState.Loading, awaitItem())

        topicsRepository.sendTopics(listOf(testTopic))
        userDataRepository.setUserData(testUserData)

        val success = awaitItem()
        assertTrue(success is TopicUiState.Success)

        cancelAndIgnoreRemainingEvents()
    }
}
```

---

## Repository Tests

```kotlin
class OfflineFirstTopicsRepositoryTest {

    private val dao = TestTopicDao()        // in-memory test DAO
    private val network = TestNetworkDataSource()

    private val repository = OfflineFirstTopicsRepository(
        topicDao = dao,
        network = network,
    )

    @Test
    fun `getTopics emits data from DAO`() = runTest {
        dao.upsertTopics(testTopicEntities)

        val topics = repository.getTopics().first()

        assertEquals(testTopicEntities.size, topics.size)
    }

    @Test
    fun `syncWith writes network data to DAO`() = runTest {
        network.setTopics(testNetworkTopics)

        val success = repository.syncWith(TestSynchronizer())

        assertTrue(success)
        assertEquals(testNetworkTopics.size, dao.getTopicEntities().first().size)
    }
}
```

### Room DAO Tests (in-memory)

```kotlin
@RunWith(AndroidJUnit4::class)
class TopicDaoTest {

    private lateinit var db: NiaDatabase
    private lateinit var dao: TopicDao

    @Before
    fun setup() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            NiaDatabase::class.java,
        ).build()
        dao = db.topicDao()
    }

    @After fun teardown() = db.close()

    @Test
    fun `upsert and query returns all topics`() = runTest {
        dao.upsertTopics(testTopicEntities)
        val result = dao.getTopicEntities().first()
        assertEquals(testTopicEntities.size, result.size)
    }
}
```

---

## Compose UI Tests

```kotlin
class TopicScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `loading state shows progress indicator`() {
        composeTestRule.setContent {
            AppTheme {
                TopicScreen(
                    uiState = TopicUiState.Loading,
                    onBackClick = {},
                    onTopicClick = {},
                    onFollowClick = {},
                )
            }
        }
        composeTestRule.onNodeWithTag("loading_indicator").assertIsDisplayed()
    }

    @Test
    fun `success state shows topic name`() {
        composeTestRule.setContent {
            AppTheme {
                TopicScreen(
                    uiState = TopicUiState.Success(testFollowableTopic, testNewsResources),
                    onBackClick = {},
                    onTopicClick = {},
                    onFollowClick = {},
                )
            }
        }
        composeTestRule
            .onNodeWithText(testFollowableTopic.topic.name)
            .assertIsDisplayed()
    }

    @Test
    fun `follow button triggers callback`() {
        var followCalled = false
        composeTestRule.setContent {
            AppTheme {
                TopicScreen(
                    uiState = TopicUiState.Success(testFollowableTopic, emptyList()),
                    onBackClick = {},
                    onTopicClick = {},
                    onFollowClick = { followCalled = true },
                )
            }
        }
        composeTestRule.onNodeWithContentDescription("Follow").performClick()
        assertTrue(followCalled)
    }
}
```

---

## Screenshot Tests with Roborazzi

Screenshot tests run on JVM (no device needed) and catch visual regressions.

```kotlin
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = RobolectricDeviceQualifiers.MediumPhone)
class TopicScreenScreenshotTest(private val uiState: TopicUiState) {

    companion object {
        @Parameterized.Parameters(name = "uiState={0}")
        @JvmStatic
        fun params() = listOf(
            TopicUiState.Loading,
            TopicUiState.Error("Network error"),
            TopicUiState.Success(previewFollowableTopic, previewNewsResources),
        )
    }

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun topicScreenScreenshot() {
        composeTestRule.setContent {
            AppTheme { TopicScreen(uiState = uiState, onBackClick = {}, onTopicClick = {}, onFollowClick = {}) }
        }
        composeTestRule.onRoot().captureRoboImage()
    }
}
```

```bash
# Record baselines
./gradlew :feature:topic:impl:recordRoborazziDebug

# Verify (CI)
./gradlew :feature:topic:impl:verifyRoborazziDebug
```

---

## Hilt Integration Tests

```kotlin
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class ForYouScreenIntegrationTest {

    @get:Rule(order = 0) val hiltRule = HiltAndroidRule(this)
    @get:Rule(order = 1) val composeTestRule = createAndroidComposeRule<HiltComponentActivity>()

    @Inject lateinit var newsRepository: NewsRepository  // receives TestNewsRepository via Hilt

    @Before fun setup() = hiltRule.inject()

    @Test
    fun forYouScreenShowsFeed() {
        composeTestRule.setContent {
            ForYouRoute(onTopicClick = {})
        }
        // Assert
    }
}

// Hilt test module — swap real repository for test double
@Module
@TestInstallIn(components = [SingletonComponent::class], replaces = [DataModule::class])
object TestDataModule {
    @Provides @Singleton
    fun provideNewsRepository(): NewsRepository = TestNewsRepository()
}
```

---

## Test Data Factories (`core:testing`)

```kotlin
object TestData {
    val testTopic = Topic(
        id = "1",
        name = "Compose",
        shortDescription = "Modern Android UI toolkit",
        longDescription = "Jetpack Compose is Android's recommended UI toolkit.",
        imageUrl = "https://example.com/compose.png",
    )

    val testFollowableTopic = FollowableTopic(topic = testTopic, isFollowed = false)

    val testNewsResource = NewsResource(
        id = "news-1",
        title = "Compose 2025",
        content = "New features...",
        url = "https://example.com/news",
        headerImageUrl = "https://example.com/header.png",
        publishDate = Instant.parse("2025-01-01T00:00:00Z"),
        type = NewsResourceType.Article,
        topics = listOf(testTopic),
    )

    val testUserData = UserData(
        bookmarkedNewsResources = setOf("news-1"),
        followedTopics = setOf("1"),
        themeBrand = ThemeBrand.DEFAULT,
        darkThemeConfig = DarkThemeConfig.FOLLOW_SYSTEM,
        useDynamicColor = true,
    )
}
```

---

## Running Tests

```bash
# Unit tests
./gradlew :feature:topic:impl:testDebugUnitTest

# All unit tests
./gradlew testDebugUnitTest

# Instrumented tests
./gradlew :feature:topic:impl:connectedDebugAndroidTest

# Screenshot — record
./gradlew recordRoborazziDebug

# Screenshot — verify (CI gate)
./gradlew verifyRoborazziDebug
```
