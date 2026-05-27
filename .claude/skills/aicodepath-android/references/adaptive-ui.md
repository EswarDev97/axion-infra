# Adaptive UI, Edge-to-Edge & Predictive Back (2025)

Covers: edge-to-edge enforcement (Android 15+), WindowInsets handling,
predictive back gesture, Material 3 Adaptive layouts, and NavigationSuiteScaffold.

---

## Edge-to-Edge (Android 15 mandatory)

Android 15 **enforces** edge-to-edge for apps targeting SDK 35. Content renders behind
system bars. You must handle WindowInsets explicitly.

### Enable in Activity

```kotlin
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()          // sets system bars transparent / translucent

        setContent {
            AppTheme {
                AppScaffold()
            }
        }
    }
}
```

### WindowInsets in Compose

```kotlin
// Top-level scaffold — consume ALL insets here to avoid padding stacks
@Composable
fun AppScaffold(
    navController: NavHostController = rememberNavController(),
) {
    NavigationSuiteScaffold(
        navigationSuiteItems = { /* nav items */ },
    ) {
        // NavHost fills remaining space inside NavigationSuiteScaffold
        AppNavHost(
            navController = navController,
            modifier = Modifier
                .fillMaxSize()
                .consumeWindowInsets(WindowInsets.navigationBars),
        )
    }
}

// Individual screen padding
@Composable
fun TopicScreen(/* ... */) {
    LazyColumn(
        contentPadding = WindowInsets.safeDrawing
            .only(WindowInsetsSides.Bottom)
            .asPaddingValues(),
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top)),
    ) { /* ... */ }
}

// Floating action button — needs navigation bar padding
FloatingActionButton(
    modifier = Modifier.navigationBarsPadding(),
    onClick = { /* ... */ },
) { /* ... */ }
```

### Common Inset Types

```kotlin
WindowInsets.statusBars          // Status bar height
WindowInsets.navigationBars      // Nav bar (bottom or side)
WindowInsets.systemBars          // statusBars + navigationBars
WindowInsets.safeDrawing         // systemBars + displayCutout
WindowInsets.ime                 // Keyboard insets (use in text input screens)
WindowInsets.safeContent         // safeDrawing + ime
```

---

## Predictive Back Gesture (Android 14+, enforced 15+)

The system back gesture provides animated previews. Apps need to handle:
1. **System animation**: no code needed — handled automatically
2. **Custom back navigation**: use `BackHandler` or `PredictiveBackHandler`

### Simple back interception

```kotlin
@Composable
fun MyScreen(onNavigateUp: () -> Unit) {
    // Intercepts back — use sparingly (users expect back to navigate)
    BackHandler(enabled = hasUnsavedChanges) {
        showDiscardConfirmation = true
    }
}
```

### Predictive back with gesture progress

```kotlin
@Composable
fun DismissiblePane(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    var progress by remember { mutableFloatStateOf(0f) }
    var isActive by remember { mutableStateOf(false) }

    PredictiveBackHandler(enabled = true) { backEvents ->
        try {
            backEvents.collect { event ->
                isActive = true
                progress = event.progress  // 0.0 → 1.0 as gesture progresses
            }
            // Gesture committed
            onDismiss()
        } catch (_: CancellationException) {
            // Gesture cancelled — reset animation
        } finally {
            isActive = false
            progress = 0f
        }
    }

    AnimatedContent(
        targetState = isActive,
        modifier = modifier.graphicsLayer {
            scaleX = 1f - (progress * 0.1f)
            scaleY = 1f - (progress * 0.1f)
            alpha = 1f - (progress * 0.3f)
        },
    ) {
        content()
    }
}
```

### Navigation back handling (type-safe)

```kotlin
// Composable back button — uses system back stack
@Composable
fun TopicAppBar(onBackClick: () -> Unit) {
    TopAppBar(
        title = { Text("Topic") },
        navigationIcon = {
            IconButton(onClick = onBackClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.back),
                )
            }
        },
    )
}
```

---

## Adaptive Layouts — Material 3 Adaptive 1.1+

Material 3 Adaptive provides layouts that automatically adapt to window size:
phone → two-pane foldable → large tablet.

### NavigationSuiteScaffold (auto-selects nav pattern)

```kotlin
@Composable
fun AppScaffold(
    currentDestination: AppDestination,
    onNavigate: (AppDestination) -> Unit,
    content: @Composable () -> Unit,
) {
    NavigationSuiteScaffold(
        navigationSuiteItems = {
            AppDestination.entries.forEach { destination ->
                item(
                    icon = { Icon(destination.icon, contentDescription = null) },
                    label = { Text(stringResource(destination.labelRes)) },
                    selected = currentDestination == destination,
                    onClick = { onNavigate(destination) },
                )
            }
        },
    ) {
        content()
    }
    // Auto-switches between:
    //  Compact width  → BottomNavigationBar
    //  Medium width   → NavigationRail
    //  Expanded width → NavigationDrawer
}
```

### ListDetailPaneScaffold (master-detail)

```kotlin
@OptIn(ExperimentalMaterial3AdaptiveApi::class)
@Composable
fun TopicsAdaptiveScreen(
    onTopicClick: (String) -> Unit,
) {
    val navigator = rememberListDetailPaneScaffoldNavigator<String>()

    BackHandler(navigator.canNavigateBack()) {
        navigator.navigateBack()
    }

    ListDetailPaneScaffold(
        directive = navigator.scaffoldDirective,
        value = navigator.scaffoldValue,
        listPane = {
            AnimatedPane {
                TopicsListPane(
                    onTopicClick = { id ->
                        navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, id)
                    },
                )
            }
        },
        detailPane = {
            AnimatedPane {
                val topicId = navigator.currentDestination?.content
                if (topicId != null) {
                    TopicDetailPane(topicId = topicId)
                } else {
                    TopicEmptyDetail()
                }
            }
        },
    )
}
```

### SupportingPaneScaffold (main + supplementary panel)

```kotlin
@OptIn(ExperimentalMaterial3AdaptiveApi::class)
@Composable
fun ArticleWithRelated(articleId: String) {
    val navigator = rememberSupportingPaneScaffoldNavigator()

    SupportingPaneScaffold(
        directive = navigator.scaffoldDirective,
        value = navigator.scaffoldValue,
        mainPane = {
            AnimatedPane {
                ArticlePane(
                    articleId = articleId,
                    onShowRelated = { navigator.navigateTo(SupportingPaneScaffoldRole.Supporting) },
                )
            }
        },
        supportingPane = {
            AnimatedPane {
                RelatedArticlesPane(articleId = articleId)
            }
        },
    )
}
```

---

## WindowSizeClass — Manual Adaptive Logic

When you need finer control than NavigationSuiteScaffold:

```kotlin
@Composable
fun AppRoot() {
    val windowSizeClass = currentWindowAdaptiveInfo().windowSizeClass

    val showNavRail = windowSizeClass.isWidthAtLeastBreakpoint(WindowWidthSizeClass.MEDIUM)

    Row(modifier = Modifier.fillMaxSize()) {
        if (showNavRail) {
            AppNavRail(/* ... */)
        }
        Column(modifier = Modifier.weight(1f)) {
            AppNavHost(/* ... */)
            if (!showNavRail) {
                AppBottomBar(/* ... */)
            }
        }
    }
}
```

---

## Foldable Support

```kotlin
// Detect fold state for dual-screen layouts
@Composable
fun FoldAwareScreen() {
    val windowInfo = currentWindowAdaptiveInfo()

    // Check if device is folded / unfolded
    val isSeparating = windowInfo.windowPosture.isTabletop  // laid flat like laptop
    val isBook = windowInfo.windowPosture.isBook             // held vertically like book

    if (isSeparating) {
        // Show content on bottom half, controls on top half
        TwoHalfLayout()
    } else {
        // Single pane
        SingleLayout()
    }
}
```

---

## Configuration Changes & Window Metrics

```kotlin
// Activity — handle orientation/resize gracefully
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Android 16+ enforces resizability — never use:
        // android:resizeableActivity="false"  ← blocked on targetSdk 36+
        // android:screenOrientation="portrait" ← blocked on targetSdk 36+

        setContent {
            AppTheme {
                AppRoot()
            }
        }
    }
}
```

---

## Compose Material 3 Expressive (2025)

Material 3 Expressive ships new expressive motion and components (some in alpha):

```kotlin
// LoadingIndicator (new in M3 Expressive)
LoadingIndicator()  // morphing animation, replaces CircularProgressIndicator

// ButtonGroup — auto-adapts button arrangement
ButtonGroup {
    Button(onClick = { }) { Text("Option 1") }
    Button(onClick = { }) { Text("Option 2") }
}

// SplitButtonLayout — primary action + overflow dropdown
SplitButtonLayout(
    leadingButton = { /* primary */ },
    trailingButton = { /* chevron */ },
)

// FloatingToolbar — contextual action bar
FloatingToolbar(/* ... */)
```

These are in `androidx.compose.material3:material3` 1.4+ (check BOM for availability).
