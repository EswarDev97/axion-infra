# Architecture Guide

Google's official three-layer Android architecture as implemented in NowInAndroid.

## Overview

```
┌────────────────────────────────────────────────────┐
│                    UI Layer                         │
│  ┌──────────────┐    ┌─────────────────────────┐   │
│  │   Screen     │◄───│      ViewModel          │   │
│  │  (Compose)   │    │  (StateFlow<UiState>)   │   │
│  └──────────────┘    └───────────┬─────────────┘   │
├──────────────────────────────────┼─────────────────┤
│                  Domain Layer    │                  │
│              ┌───────────────────▼──────┐          │
│              │       Use Cases          │          │
│              │  (combine, transform)    │          │
│              └───────────┬──────────────┘          │
├──────────────────────────┼─────────────────────────┤
│                  Data Layer                         │
│  ┌───────────────────────▼──────────────────────┐  │
│  │              Repository                       │  │
│  │    (offline-first, single source of truth)   │  │
│  └─────────┬─────────────────────┬──────────────┘  │
│  ┌─────────▼─────────┐  ┌───────▼──────────────┐  │
│  │  Local DataSource │  │  Remote DataSource   │  │
│  │   (Room + DAO)    │  │  (Retrofit / Ktor)   │  │
│  └───────────────────┘  └──────────────────────┘  │
└────────────────────────────────────────────────────┘
```

**Rule**: Events flow DOWN (UI → Data), data flows UP (Data → UI). Local storage is always
the source of truth.

---

## Data Layer

### Principles
- **Offline-first**: Room is the source of truth; network only refreshes it
- **Repository pattern**: Single public API per business domain
- **Reactive streams**: Always return `Flow<T>`, never one-shot `suspend fun get()`
- **Expose models**: Map entities → domain models at the repository boundary

### Repository Interface

```kotlin
// core:data — public, interface
interface TopicsRepository {
    fun getTopics(): Flow<List<Topic>>
    fun getTopic(id: String): Flow<Topic>
    suspend fun setTopicFollowed(topicId: String, followed: Boolean)
    suspend fun syncWith(synchronizer: Synchronizer): Boolean
}
```

### Offline-First Implementation

```kotlin
// core:data — internal, implementation
internal class OfflineFirstTopicsRepository @Inject constructor(
    private val topicDao: TopicDao,
    private val network: NiaNetworkDataSource,
) : TopicsRepository {

    override fun getTopics(): Flow<List<Topic>> =
        topicDao.getTopicEntities()
            .map { entities -> entities.map(TopicEntity::asExternalModel) }

    override fun getTopic(id: String): Flow<Topic> =
        topicDao.getTopicEntity(id).map(TopicEntity::asExternalModel)

    override suspend fun setTopicFollowed(topicId: String, followed: Boolean) {
        topicDao.upsertTopicFollowed(topicId, followed)
    }

    override suspend fun syncWith(synchronizer: Synchronizer): Boolean =
        synchronizer.changeListSync(
            versionReader = ChangeListVersions::topicVersion,
            changeListFetcher = { network.getTopicChangeList(after = it) },
            versionUpdater = { latestVersion -> copy(topicVersion = latestVersion) },
            modelDeleter = topicDao::deleteTopics,
            modelUpdater = { changedIds ->
                val networkTopics = network.getTopics(ids = changedIds)
                topicDao.upsertTopics(networkTopics.map(NetworkTopic::asEntity))
            },
        )
}
```

### Room DAO

```kotlin
@Dao
interface TopicDao {
    @Query("SELECT * FROM topics ORDER BY name ASC")
    fun getTopicEntities(): Flow<List<TopicEntity>>

    @Query("SELECT * FROM topics WHERE id = :topicId")
    fun getTopicEntity(topicId: String): Flow<TopicEntity>

    @Upsert
    suspend fun upsertTopics(entities: List<TopicEntity>)

    @Query("DELETE FROM topics WHERE id IN (:ids)")
    suspend fun deleteTopics(ids: List<String>)
}
```

### Room Entity

```kotlin
@Entity(tableName = "topics")
data class TopicEntity(
    @PrimaryKey val id: String,
    val name: String,
    val shortDescription: String,
    val longDescription: String,
    val imageUrl: String,
    val isFollowed: Boolean = false,
)
```

### Model Mapping (entity ↔ domain ↔ network)

```kotlin
// Entity → Domain model (in core:database)
fun TopicEntity.asExternalModel() = Topic(
    id = id,
    name = name,
    shortDescription = shortDescription,
    longDescription = longDescription,
    imageUrl = imageUrl,
)

// Network model → Entity
fun NetworkTopic.asEntity() = TopicEntity(
    id = id,
    name = name,
    shortDescription = shortDescription,
    longDescription = longDescription,
    imageUrl = imageUrl,
)
```

### Data Sources Summary

| Type | Implementation | Purpose |
|------|----------------|---------|
| Local | Room DAO | Persistent storage — source of truth |
| Remote | Retrofit / Ktor | Network data fetching |
| Preferences | Proto DataStore | Typed user settings |

### Data Synchronization with WorkManager

```kotlin
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val newsRepository: NewsRepository,
    private val topicsRepository: TopicsRepository,
) : CoroutineWorker(context, params), Synchronizer {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val syncedSuccessfully = awaitAll(
            async { newsRepository.syncWith(this@SyncWorker) },
            async { topicsRepository.syncWith(this@SyncWorker) },
        ).all { it }

        if (syncedSuccessfully) Result.success() else Result.retry()
    }

    companion object {
        fun startUpSyncWork() = OneTimeWorkRequestBuilder<SyncWorker>()
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .setConstraints(Constraints(requiredNetworkType = NetworkType.CONNECTED))
            .build()
    }
}
```

---

## Domain Layer

Use cases are **optional** — only create them when:
- Logic is shared across multiple ViewModels
- Complex transformations combining data from multiple repositories
- Business rules that don't belong in UI or Data layer

### Use Case Pattern

```kotlin
// Returns Flow directly (no suspend — callers collect as needed)
class GetUserNewsResourcesUseCase @Inject constructor(
    private val newsRepository: NewsRepository,
    private val userDataRepository: UserDataRepository,
) {
    operator fun invoke(
        filterTopicIds: Set<String> = emptySet(),
    ): Flow<List<UserNewsResource>> =
        newsRepository.getNewsResources(
            query = NewsResourceQuery(filterTopicIds = filterTopicIds),
        ).combine(userDataRepository.userData) { newsResources, userData ->
            newsResources.mapToUserNewsResources(userData)
        }
}
```

---

## UI Layer

### UiState Sealed Interface

```kotlin
sealed interface ForYouUiState {
    data object Loading : ForYouUiState

    data class Success(
        val feed: List<UserNewsResource>,
        val isRefreshing: Boolean = false,   // for pull-to-refresh overlays
    ) : ForYouUiState
}
```

### ViewModel

```kotlin
@HiltViewModel
class ForYouViewModel @Inject constructor(
    private val getUserNewsResourcesUseCase: GetUserNewsResourcesUseCase,
    private val userDataRepository: UserDataRepository,
) : ViewModel() {

    val uiState: StateFlow<ForYouUiState> =
        getUserNewsResourcesUseCase()
            .map(ForYouUiState::Success)
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(5_000),
                initialValue = ForYouUiState.Loading,
            )

    fun setNewsResourceBookmarked(newsResourceId: String, bookmarked: Boolean) {
        viewModelScope.launch {
            userDataRepository.setNewsResourceBookmarked(newsResourceId, bookmarked)
        }
    }
}
```

### Screen + Route

```kotlin
@Composable
internal fun ForYouRoute(
    onTopicClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ForYouViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    ForYouScreen(
        uiState = uiState,
        onTopicClick = onTopicClick,
        onBookmarkChange = viewModel::setNewsResourceBookmarked,
        modifier = modifier,
    )
}

@Composable
internal fun ForYouScreen(
    uiState: ForYouUiState,
    onTopicClick: (String) -> Unit,
    onBookmarkChange: (String, Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        ForYouUiState.Loading -> LoadingState(modifier)
        is ForYouUiState.Success ->
            LazyColumn(modifier = modifier) {
                items(uiState.feed, key = { it.id }) { resource ->
                    NewsResourceCard(
                        userNewsResource = resource,
                        onBookmarkChange = { onBookmarkChange(resource.id, it) },
                        onClick = { onTopicClick(resource.id) },
                    )
                }
            }
    }
}
```

---

## Error Handling (2025 Pattern)

Prefer sealed interfaces over raw exceptions for domain errors:

```kotlin
sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>
    data class Error(val exception: Throwable, val message: String? = null) : ApiResult<Nothing>
    data object Loading : ApiResult<Nothing>
}

// Repository wrapping
suspend fun fetchData(): ApiResult<List<Item>> =
    runCatching { api.getData() }
        .fold(
            onSuccess = { ApiResult.Success(it) },
            onFailure = { ApiResult.Error(it) },
        )
```

---

## Data Flow — End-to-End Example

1. App starts → WorkManager enqueues `SyncWorker`
2. ViewModel subscribes to `GetUserNewsResourcesUseCase`, emits `Loading`
3. `SyncWorker` calls `repository.syncWith(this)`
4. Repository fetches change list from Retrofit network source
5. Repository upserts fetched data into Room
6. Room DAO emits updated data via its `Flow`
7. Repository maps `TopicEntity` → `Topic` domain model
8. UseCase combines news with `UserData` from DataStore
9. ViewModel receives combined data, emits `Success(feed)`
10. Screen recomposes with latest feed
