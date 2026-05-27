# Performance Guide (2025)

Covers Baseline Profiles, Compose Strong Skip Mode, Compose Compiler Metrics,
and Macrobenchmark — the three pillars of production Android performance.

---

## Baseline Profiles

Baseline Profiles pre-compile critical code paths via AOT before first execution,
reducing cold-start time by **~30%** and eliminating JIT stutter during key flows.

### Module Setup

Create a separate `benchmark/` module:

```kotlin
// benchmark/build.gradle.kts
plugins {
    alias(libs.plugins.android.test)
    alias(libs.plugins.baselineprofile)
}

android {
    namespace = "com.example.benchmark"
    targetProjectPath = ":app"
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    defaultConfig { minSdk = 28 }
}

dependencies {
    implementation(libs.androidx.macrobenchmark)
    implementation(libs.androidx.test.ext)
}
```

### BaselineProfileGenerator

```kotlin
// benchmark/src/androidTest/kotlin/StartupBenchmark.kt
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {

    @get:Rule
    val baselineProfileRule = BaselineProfileRule()

    @Test
    fun generate() = baselineProfileRule.collect(
        packageName = "com.example.app",
    ) {
        pressHome()
        startActivityAndWait()

        // Interact with critical user journeys
        device.findObject(By.text("For You")).click()
        device.waitForIdle()
        device.findObject(By.text("Interests")).click()
        device.waitForIdle()
    }
}
```

### App module wiring

```kotlin
// app/build.gradle.kts
plugins {
    alias(libs.plugins.baselineprofile)
}
dependencies {
    implementation(libs.androidx.profileinstaller)  // runtime installer
    baselineProfile(projects.benchmark)             // links generator
}
```

### Generate and commit

```bash
# Generate baseline profile
./gradlew :app:generateReleaseBaselineProfile

# Committed file: app/src/main/baseline-prof.txt
# Included automatically in release APK/AAB by ProfileInstaller
```

---

## Macrobenchmark (startup & frame timing)

```kotlin
@RunWith(AndroidJUnit4::class)
class StartupBenchmark {

    @get:Rule
    val benchmarkRule = MacrobenchmarkRule()

    @Test
    fun startupCompilationNone() = benchmark(CompilationMode.None())

    @Test
    fun startupCompilationBaselineProfiles() = benchmark(CompilationMode.Partial())

    @Test
    fun startupCompilationFull() = benchmark(CompilationMode.Full())

    private fun benchmark(compilationMode: CompilationMode) {
        benchmarkRule.measureRepeated(
            packageName = "com.example.app",
            metrics = listOf(StartupTimingMetric()),
            compilationMode = compilationMode,
            startupMode = StartupMode.COLD,
            iterations = 10,
        ) {
            pressHome()
            startActivityAndWait()
        }
    }
}
```

---

## Compose Strong Skip Mode

Strong Skip Mode allows Compose to skip composables with **unstable** parameters by
comparing them with **instance equality** (`===`). This reduces unnecessary recompositions
without requiring every class to be annotated with `@Stable`.

**Enabled by default** since Compose 1.5.4. Verify it's active:

```kotlin
// build-logic/convention/AndroidCompose.kt
composeCompiler {
    // Confirm strong skipping (default true in 2025)
    enableExperimentalStrongSkippingMode = true
    // Generate stability/skippability report
    reportsDestination = layout.buildDirectory.dir("compose_compiler")
    metricsDestination = layout.buildDirectory.dir("compose_compiler")
}
```

---

## Compose Compiler Metrics

After enabling `metricsDestination`, run:

```bash
./gradlew :feature:foryou:impl:assembleRelease
```

Read the report at `build/compose_compiler/`:
- `*-composables.txt` — lists each composable with skippable/restartable/stable status
- `*-classes.txt` — stability classification of each class

### What to fix

| Status | Meaning | Fix |
|--------|---------|-----|
| `skippable` | Compose can skip ✅ | Good |
| `restartable` | Can restart from here ✅ | Good |
| `unstable` on a parameter | Forces recompose | Annotate class `@Immutable` or use Strong Skip |
| `inline` class | Not tracked | Usually fine |

### Making classes stable

```kotlin
// Pure data — all vals, all immutable children
@Immutable
data class Topic(val id: String, val name: String)

// Has mutable observable state
@Stable
class CartState {
    var itemCount by mutableIntStateOf(0)
}

// Unstable stdlib collections — wrap with @Immutable wrapper
@Immutable
data class TopicListUiState(
    val topics: List<Topic>,   // List is technically unstable but safe here
)
// OR use kotlinx-collections-immutable:
// val topics: ImmutableList<Topic> = persistentListOf()
```

---

## App Startup Optimisation

### Avoid work on main thread at startup

```kotlin
// Use App Startup library to defer and order initializers
class TimberInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        if (BuildConfig.DEBUG) Timber.plant(Timber.DebugTree())
    }
    override fun dependencies() = emptyList<Class<out Initializer<*>>>()
}
```

### Splash Screen API (Android 12+)

```kotlin
// MainActivity.kt
override fun onCreate(savedInstanceState: Bundle?) {
    val splashScreen = installSplashScreen()

    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    // Keep splash until app is ready
    splashScreen.setKeepOnScreenCondition {
        !viewModel.isReady.value
    }
    // Animate exit
    splashScreen.setOnExitAnimationListener { splashScreenView ->
        splashScreenView.iconView?.animate()
            ?.scaleX(0f)?.scaleY(0f)
            ?.withEndAction { splashScreenView.remove() }
            ?.start()
    }
}
```

---

## Memory Performance

```kotlin
// Avoid creating objects inside composables — use remember
@Composable
fun ExpensiveScreen(items: List<Item>) {
    // BAD: DateTimeFormatter created on every recomposition
    val formatter = DateTimeFormatter.ofPattern("MMM d, yyyy")

    // GOOD: created once
    val formatter = remember { DateTimeFormatter.ofPattern("MMM d, yyyy") }
}

// Use rememberSaveable for state that survives config changes
var query by rememberSaveable { mutableStateOf("") }
```

---

## Compose Layout Performance

```kotlin
// Use intrinsic measurements sparingly (expensive)
Row(modifier = Modifier.height(IntrinsicSize.Min)) { ... }   // OK — single row

// Avoid nested weight + intrinsics — causes multiple layout passes

// LazyLayout keys reduce item rebinds
LazyColumn {
    items(feed, key = { it.id }) { FeedCard(it) }
}

// contentType groups similar composables for node reuse
LazyColumn {
    items(
        items = mixed,
        key = { it.key() },
        contentType = { if (it is Article) "article" else "video" },
    ) { item ->
        when (item) {
            is Article -> ArticleCard(item)
            is Video   -> VideoCard(item)
        }
    }
}
```
