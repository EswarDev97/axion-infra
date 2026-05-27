---
name: aicodepath-android
description: >
  Build production-quality Android applications using Kotlin 2.x, Jetpack Compose, and
  Google's official architecture guidance (NowInAndroid patterns). Use this skill whenever
  the user is working on an Android project, mentions Kotlin, Compose, Hilt, Room, ViewModel,
  Repository, feature modules, Gradle, or navigation. Trigger on requests like "create a
  screen", "add a feature module", "set up offline-first repository", "configure Gradle",
  "write a ViewModel", or any Android-related architecture or implementation task.
  Make sure to use this skill whenever the user mentions Android, even if they only ask
  a quick question — it ensures all patterns use the correct 2025 SOTA stack.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: "[feature name | task description | 'setup' | 'explain X']"
---

# Android Development — SOTA 2025 Stack

Build Android apps following Google's official architecture guidance, NowInAndroid reference
patterns, and 2025 best practices: Kotlin 2.x K2 compiler, Compose strong skip mode,
type-safe navigation, edge-to-edge, predictive back, and Baseline Profiles.

## Quick Reference

| Task | Reference |
|------|-----------|
| Project structure & modules | [modularization.md](references/modularization.md) |
| Architecture layers (UI, Domain, Data) | [architecture.md](references/architecture.md) |
| Jetpack Compose patterns + stability | [compose-patterns.md](references/compose-patterns.md) |
| Gradle, Kotlin 2.x, convention plugins | [gradle-setup.md](references/gradle-setup.md) |
| Testing (no-mock test doubles) | [testing.md](references/testing.md) |
| Baseline Profiles, Strong Skip, benchmarks | [performance.md](references/performance.md) |
| Edge-to-edge, adaptive layouts, predictive back | [adaptive-ui.md](references/adaptive-ui.md) |

## Workflow Decision Tree

**Creating a new project?**
→ Read [modularization.md](references/modularization.md) for project structure
→ Read [gradle-setup.md](references/gradle-setup.md) for Kotlin 2.x build setup

**Adding a new feature?**
→ Create `feature:myfeature:api` and `feature:myfeature:impl` modules
→ Scaffold with `python scripts/generate_feature.py <name> --package com.example --path .`
→ Follow patterns in [architecture.md](references/architecture.md)

**Building UI screens?**
→ Read [compose-patterns.md](references/compose-patterns.md) — Route-Screen split, state hoisting
→ Create: `Screen.kt` + `ViewModel.kt` + `UiState.kt` + `Navigation.kt` + `Module.kt`

**Setting up data layer?**
→ Read data layer section in [architecture.md](references/architecture.md)
→ Create: `Repository` interface + `OfflineFirst` implementation + `DAO` + mapping functions

**Optimising performance?**
→ Read [performance.md](references/performance.md) — Baseline Profiles, Strong Skip Mode

**Supporting tablets / foldables / large screens?**
→ Read [adaptive-ui.md](references/adaptive-ui.md) — NavigationSuiteScaffold, edge-to-edge

## Core Principles

1. **Offline-first**: Local database is source of truth; sync with remote via WorkManager
2. **Unidirectional data flow (UDF)**: Events flow down, data flows up
3. **Reactive streams**: Expose all data as `Flow<T>`, never one-shot getters
4. **Modular by feature**: Each feature is self-contained with `api`/`impl` submodules
5. **Testable by design**: Program to interfaces; use hand-crafted test doubles, no mocks
6. **Performance by default**: Strong Skip Mode, `@Stable`/`@Immutable`, Baseline Profiles
7. **Adaptive first**: Handle edge-to-edge, WindowInsets, predictive back from day one

## Architecture Layers

```
┌─────────────────────────────────────────┐
│              UI Layer                    │
│  (Compose Screens + ViewModels)          │
├─────────────────────────────────────────┤
│           Domain Layer                   │
│  (Use Cases — optional, for reuse)       │
├─────────────────────────────────────────┤
│            Data Layer                    │
│  (Repositories + DataSources + Room)     │
└─────────────────────────────────────────┘
```

## Module Types

```
app/                    # App shell — navigation host, scaffolding
feature/
  ├── featurename/
  │   ├── api/          # Navigation keys / route objects (public)
  │   └── impl/         # Screen, ViewModel, DI, internal navigation
core/
  ├── model/            # Domain models — pure Kotlin, zero Android deps
  ├── data/             # Repositories + coordinators
  ├── database/         # Room DAOs, entities, migrations
  ├── network/          # Retrofit/Ktor, network models
  ├── datastore/        # Proto DataStore or Preferences DataStore
  ├── common/           # Dispatchers, Result<T>, extensions
  ├── ui/               # Reusable Compose components
  ├── designsystem/     # Theme, colour tokens, base components
  └── testing/          # Test doubles, TestDispatcherRule, factories
benchmark/              # Macrobenchmark + BaselineProfileGenerator
```

## Standard Patterns

### ViewModel (Kotlin 2.x)

```kotlin
@HiltViewModel
class MyFeatureViewModel @Inject constructor(
    private val myRepository: MyRepository,
) : ViewModel() {

    val uiState: StateFlow<MyFeatureUiState> = myRepository
        .getData()
        .map { data -> MyFeatureUiState.Success(data) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = MyFeatureUiState.Loading,
        )

    fun onAction(action: MyFeatureAction) {
        when (action) {
            is MyFeatureAction.ItemClicked -> handleItemClick(action.id)
        }
    }
}
```

### UiState — sealed interface (exhaustive, compiler-enforced)

```kotlin
sealed interface MyFeatureUiState {
    data object Loading : MyFeatureUiState
    data class Success(val items: List<Item>) : MyFeatureUiState
    data class Error(val message: String) : MyFeatureUiState
}
```

### Route ↔ Screen split

```kotlin
// Route: wires ViewModel + navigation callbacks
@Composable
internal fun MyFeatureRoute(
    onNavigateToDetail: (String) -> Unit,
    viewModel: MyFeatureViewModel = hiltViewModel(),
    modifier: Modifier = Modifier,
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    MyFeatureScreen(
        uiState = uiState,
        onAction = viewModel::onAction,
        onNavigateToDetail = onNavigateToDetail,
        modifier = modifier,
    )
}

// Screen: pure UI — testable without Hilt
@Composable
internal fun MyFeatureScreen(
    uiState: MyFeatureUiState,
    onAction: (MyFeatureAction) -> Unit,
    onNavigateToDetail: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        MyFeatureUiState.Loading -> LoadingIndicator(modifier)
        is MyFeatureUiState.Success -> ContentList(uiState.items, onAction, modifier)
        is MyFeatureUiState.Error -> ErrorMessage(uiState.message, modifier)
    }
}
```

### Type-safe Navigation (Navigation 2.8+)

```kotlin
// In api module — route is a serializable data class
@Serializable
data class MyFeatureRoute(val id: String? = null)

fun NavController.navigateToMyFeature(id: String? = null) {
    navigate(MyFeatureRoute(id))
}

// In impl module — graph builder extension
fun NavGraphBuilder.myFeatureScreen(onBackClick: () -> Unit) {
    composable<MyFeatureRoute> {
        MyFeatureRoute(onBackClick = onBackClick)
    }
}

// Reading route argument in ViewModel
private val id: String? = savedStateHandle.toRoute<MyFeatureRoute>().id
```

### Repository — offline-first

```kotlin
interface MyRepository {
    fun getData(): Flow<List<MyModel>>
    suspend fun syncWith(synchronizer: Synchronizer): Boolean
}

internal class OfflineFirstMyRepository @Inject constructor(
    private val localDao: MyDao,
    private val networkApi: MyNetworkApi,
) : MyRepository {

    override fun getData(): Flow<List<MyModel>> =
        localDao.getAll().map { entities -> entities.map { it.toModel() } }

    override suspend fun syncWith(synchronizer: Synchronizer): Boolean =
        synchronizer.changeListSync(
            versionReader = ChangeListVersions::myVersion,
            changeListFetcher = { networkApi.getChangeList(after = it) },
            versionUpdater = { copy(myVersion = it) },
            modelDeleter = localDao::deleteItems,
            modelUpdater = { ids ->
                val items = networkApi.getItems(ids)
                localDao.upsert(items.map { it.toEntity() })
            },
        )
}
```

## Technology Stack (2025)

| Layer | Library | Notes |
|-------|---------|-------|
| Language | Kotlin 2.1.x | K2 compiler default |
| UI | Jetpack Compose (BOM 2025.x) | Strong Skip Mode enabled |
| Architecture | MVVM + UDF | `StateFlow`, `collectAsStateWithLifecycle` |
| DI | Hilt 2.54+ | KSP annotation processing |
| Database | Room 2.7+ | Room Gradle Plugin for schema export |
| Network | Retrofit 2.x + Kotlinx Serialization | or Ktor for KMP |
| Async | Coroutines 1.9+ + Flow | `CoroutineWorker` for background work |
| Navigation | Navigation Compose 2.8+ | Type-safe `@Serializable` routes |
| Images | Coil 3.x | KMP-ready, Compose-first |
| Paging | Paging 3 | `RemoteMediator` for offline-first pagination |
| Storage | Proto DataStore 1.1+ | or Preferences DataStore for simple flags |
| Build | AGP 8.7+ + Convention Plugins | Kotlin 2.x: compose compiler bundled |
| Performance | Baseline Profiles + Macrobenchmark | ~30% faster first launch |
| Auth | Credential Manager | Passkeys + passwords; replaces legacy APIs |

## Creating a New Feature — Checklist

1. Run scaffold script: `python scripts/generate_feature.py <name> --package <pkg> --path .`
2. Register modules in `settings.gradle.kts`
3. Add `implementation(projects.feature.<name>.impl)` in `app/build.gradle.kts`
4. Wire navigation in `AppNavHost`
5. Inject repository in ViewModel constructor
6. Write test doubles in `core:testing`
7. Write ViewModel unit test using `TestDispatcherRule`
8. Write Screen UI test (pure composable, no Hilt required)
