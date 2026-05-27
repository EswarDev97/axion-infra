# Jetpack Compose Patterns (2025)

UI patterns following NowInAndroid, Material 3, and 2025 Compose best practices.

## Screen Architecture — Route-Screen Split

Always split Composables into a **Route** (ViewModel-aware) and a **Screen** (pure UI).
This makes Screen testable without Hilt and enables previews without DI.

```kotlin
// Route: ViewModel + navigation wiring
@Composable
internal fun TopicRoute(
    onBackClick: () -> Unit,
    onTopicClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TopicViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    TopicScreen(
        uiState = uiState,
        onBackClick = onBackClick,
        onTopicClick = onTopicClick,
        onFollowClick = viewModel::followTopic,
        modifier = modifier,
    )
}

// Screen: pure UI — no ViewModel, no Hilt
@Composable
internal fun TopicScreen(
    uiState: TopicUiState,
    onBackClick: () -> Unit,
    onTopicClick: (String) -> Unit,
    onFollowClick: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        TopicUiState.Loading -> LoadingState(modifier)
        is TopicUiState.Error -> ErrorState(uiState.message, modifier)
        is TopicUiState.Success -> TopicContent(
            topic = uiState.topic,
            onBackClick = onBackClick,
            onTopicClick = onTopicClick,
            onFollowClick = onFollowClick,
            modifier = modifier,
        )
    }
}
```

---

## State Management

### Collecting StateFlow with lifecycle awareness

```kotlin
// Always use collectAsStateWithLifecycle (not collectAsState)
// Stops collection when app is backgrounded — saves battery/resources
val uiState by viewModel.uiState.collectAsStateWithLifecycle()
```

### StateFlow in ViewModel with combine

```kotlin
@HiltViewModel
class TopicViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val topicsRepository: TopicsRepository,
    getUserNewsResourcesUseCase: GetUserNewsResourcesUseCase,
) : ViewModel() {

    // Read type-safe navigation argument (Navigation 2.8+)
    private val topicId: String = savedStateHandle.toRoute<TopicRoute>().id

    val uiState: StateFlow<TopicUiState> = combine(
        topicsRepository.getTopic(topicId),
        getUserNewsResourcesUseCase(filterTopicIds = setOf(topicId)),
    ) { topic, newsResources ->
        TopicUiState.Success(topic = topic, newsResources = newsResources)
    }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = TopicUiState.Loading,
        )

    fun followTopic(followed: Boolean) {
        viewModelScope.launch {
            topicsRepository.setTopicFollowed(topicId, followed)
        }
    }
}
```

### Action sealed interface (UDF events)

```kotlin
sealed interface TopicAction {
    data class FollowClicked(val followed: Boolean) : TopicAction
    data class NewsResourceBookmarked(val id: String, val bookmarked: Boolean) : TopicAction
}
```

---

## Compose Stability & Performance

Understanding Compose stability is critical for avoiding unnecessary recompositions.

### Strong Skip Mode (Compose 1.5.4+ default)

Strong Skip Mode is **enabled by default** in modern Compose. It skips recomposition
even for composables with **unstable parameters**, using instance equality (`===`).
You benefit automatically — but still annotate data classes for clarity and safety.

```kotlin
// Enable explicitly if needed (usually automatic in 2025)
// In build-logic/convention/AndroidCompose.kt:
composeCompiler {
    enableExperimentalStrongSkippingMode = true  // default in recent versions
}
```

### @Stable and @Immutable

```kotlin
// @Immutable: all public properties are val and deeply immutable
// Compose compiler generates maximally optimised code
@Immutable
data class Topic(
    val id: String,
    val name: String,
    val imageUrl: String,
)

// @Stable: mutable, but Compose will be notified of changes
@Stable
class UiTopicState(
    name: String,
) {
    var name by mutableStateOf(name)
}
```

### derivedStateOf — limit recomposition on rapidly-changing state

```kotlin
val lazyListState = rememberLazyListState()

// Without derivedStateOf: recomposes on EVERY scroll pixel
val showFab = lazyListState.firstVisibleItemIndex > 0  // BAD

// With derivedStateOf: recomposes only when boolean flips
val showFab by remember {
    derivedStateOf { lazyListState.firstVisibleItemIndex > 0 }
}
```

### Lambda modifier pattern — skip allocations

```kotlin
// BAD: triggers recomposition every time scrollProgress changes
Modifier.alpha(alpha = scrollProgress)

// GOOD: lambda deferred — no recomposition for alpha change
Modifier.graphicsLayer { alpha = scrollProgress }
```

### key in lazy layouts

```kotlin
LazyColumn {
    items(
        items = feed,
        key = { it.id },                   // stable, unique key
        contentType = { it.type.name },    // optional: improves diff
    ) { item ->
        FeedCard(item = item)
    }
}
```

---

## Component Patterns

### Stateless components (state hoisting)

```kotlin
@Composable
fun NiaTopicTag(
    text: String,
    followed: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,  // always last named param before trailing lambdas
) {
    FilterChip(
        selected = followed,
        onClick = onClick,
        label = { Text(text) },
        modifier = modifier,
        leadingIcon = if (followed) {
            { Icon(NiaIcons.Check, contentDescription = null) }
        } else null,
    )
}
```

### Async images with Coil 3

```kotlin
// Standard — use for lists and performance-critical layouts
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(imageUrl)
        .crossfade(true)
        .build(),
    contentDescription = contentDescription,
    contentScale = ContentScale.Crop,
    modifier = modifier,
)

// SubcomposeAsyncImage — only when you need custom loading/error slots
// Avoid in LazyColumn / LazyRow (slower due to subcomposition)
SubcomposeAsyncImage(
    model = imageUrl,
    contentDescription = contentDescription,
) {
    when (painter.state) {
        is AsyncImagePainter.State.Loading -> CircularProgressIndicator()
        is AsyncImagePainter.State.Error -> ErrorPlaceholder()
        else -> SubcomposeAsyncImageContent()
    }
}
```

---

## Navigation (Navigation Compose 2.8+)

### Type-safe routes with @Serializable

```kotlin
// In feature:myfeature:api module
@Serializable
data class TopicRoute(val id: String)

@Serializable
data object InterestsRoute  // no args

// Extension on NavController
fun NavController.navigateToTopic(topicId: String, navOptions: NavOptions? = null) {
    navigate(TopicRoute(topicId), navOptions)
}

// In feature:myfeature:impl
fun NavGraphBuilder.topicScreen(
    onBackClick: () -> Unit,
    onTopicClick: (String) -> Unit,
) {
    composable<TopicRoute> { backStackEntry ->
        // Read args via toRoute — type-safe, no string parsing
        val route = backStackEntry.toRoute<TopicRoute>()
        TopicRoute(
            topicId = route.id,
            onBackClick = onBackClick,
            onTopicClick = onTopicClick,
        )
    }
}
```

### App-level NavHost

```kotlin
@Composable
fun AppNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = ForYouRoute,
        modifier = modifier,
    ) {
        forYouScreen(onTopicClick = navController::navigateToTopic)
        topicScreen(
            onBackClick = navController::popBackStack,
            onTopicClick = navController::navigateToTopic,
        )
        interestsGraph(
            onTopicClick = navController::navigateToTopic,
            nestedGraphs = {
                topicScreen(
                    onBackClick = navController::popBackStack,
                    onTopicClick = navController::navigateToTopic,
                )
            },
        )
    }
}
```

---

## Theming — Material 3

```kotlin
// core:designsystem
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,       // Android 12+ Material You
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content,
    )
}
```

---

## Previews

### Multi-theme preview annotation

```kotlin
@Preview(name = "Light", showBackground = true)
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES, showBackground = true)
annotation class ThemePreviews

@Preview(device = Devices.PHONE)
@Preview(device = Devices.FOLDABLE)
@Preview(device = Devices.TABLET)
annotation class DevicePreviews
```

### Preview with PreviewParameterProvider (all states)

```kotlin
class TopicUiStateProvider : PreviewParameterProvider<TopicUiState> {
    override val values = sequenceOf(
        TopicUiState.Loading,
        TopicUiState.Error("Network unavailable"),
        TopicUiState.Success(previewTopic, previewNewsResources),
    )
}

@ThemePreviews
@DevicePreviews
@Composable
private fun TopicScreenPreview(
    @PreviewParameter(TopicUiStateProvider::class) uiState: TopicUiState,
) {
    AppTheme {
        TopicScreen(
            uiState = uiState,
            onBackClick = {},
            onTopicClick = {},
            onFollowClick = {},
        )
    }
}
```

---

## Side Effects

```kotlin
// LaunchedEffect: run suspend work on key change
LaunchedEffect(viewModel) {
    viewModel.uiEvents.collect { event ->
        when (event) {
            is UiEvent.ShowSnackbar -> snackbarHostState.showSnackbar(event.message)
            UiEvent.NavigateUp -> onBackClick()
        }
    }
}

// DisposableEffect: run work and clean up when composable leaves composition
DisposableEffect(lifecycleOwner) {
    val observer = LifecycleEventObserver { _, event ->
        if (event == Lifecycle.Event.ON_RESUME) viewModel.onResumed()
    }
    lifecycleOwner.lifecycle.addObserver(observer)
    onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
}

// rememberUpdatedState: capture the latest lambda without restarting effects
val currentOnTimeout by rememberUpdatedState(onTimeout)
LaunchedEffect(Unit) {
    delay(SplashWaitTime)
    currentOnTimeout()  // always uses the latest onTimeout
}
```
