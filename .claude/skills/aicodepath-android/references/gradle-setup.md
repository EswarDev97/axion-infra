# Gradle & Build Configuration (Kotlin 2.x / AGP 8.7+)

## Key 2025 Changes

### Compose Compiler is bundled with Kotlin 2.x
With Kotlin 2.0+, the Compose compiler ships as a Kotlin compiler plugin — no separate
`kotlinCompilerExtensionVersion` is needed. Use the `org.jetbrains.kotlin.plugin.compose`
Gradle plugin instead.

```kotlin
// build-logic/convention/build.gradle.kts — add compose plugin classpath
compileOnly(libs.kotlin.compose.gradlePlugin)

// AndroidCompose.kt convention plugin (Kotlin 2.x style — no composeOptions block)
internal fun Project.configureAndroidCompose(
    commonExtension: CommonExtension<*, *, *, *, *, *>,
) {
    pluginManager.apply("org.jetbrains.kotlin.plugin.compose")  // NEW in Kotlin 2.x

    commonExtension.apply {
        buildFeatures { compose = true }
        // No composeOptions.kotlinCompilerExtensionVersion needed
    }

    dependencies {
        val bom = libs.findLibrary("androidx-compose-bom").get()
        add("implementation", platform(bom))
        add("androidTestImplementation", platform(bom))
        add("debugImplementation", libs.findLibrary("androidx-compose-ui-tooling").get())
        add("implementation", libs.findLibrary("androidx-compose-ui-tooling-preview").get())
    }
}
```

---

## Version Catalog (`gradle/libs.versions.toml`)

```toml
[versions]
# SDK
compileSdk          = "35"
minSdk              = "24"
targetSdk           = "35"

# Kotlin — K2 compiler enabled by default
kotlin              = "2.1.21"
kotlinxCoroutines   = "1.9.0"
kotlinxSerializationJson = "1.7.3"
kotlinxDatetime     = "0.6.1"
ksp                 = "2.1.21-1.0.33"

# AndroidX
androidxCore        = "1.15.0"
androidxLifecycle   = "2.8.7"
androidxActivity    = "1.9.3"
androidxNavigation  = "2.8.9"
androidxComposeBom  = "2025.03.01"
androidxHiltNavigationCompose = "1.2.0"
androidxRoom        = "2.7.0"
androidxDataStore   = "1.1.2"
androidxWork        = "2.10.0"
androidxPaging      = "3.3.5"
androidxProfileinstaller = "1.4.1"

# Material 3
material3Adaptive   = "1.1.0"

# DI
hilt                = "2.54"
hiltExt             = "1.2.0"

# Networking
retrofit            = "2.11.0"
retrofitKotlinxSerializationJson = "1.0.0"
okhttp              = "4.12.0"

# Image loading
coil                = "3.1.0"

# Build
androidGradlePlugin = "8.7.3"

# Testing
junit               = "4.13.2"
androidxTestExt     = "1.2.1"
androidxTestRunner  = "1.6.2"
turbine             = "1.2.0"
roborazzi           = "1.7.0"

# Code quality
detekt              = "1.23.7"
ktlint              = "12.1.2"

# Macrobenchmark / Baseline Profiles
androidxMacrobenchmark = "1.3.3"
baselineprofile     = "1.3.4"

[libraries]
# Kotlin
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "kotlinxCoroutines" }
kotlinx-coroutines-test    = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test",    version.ref = "kotlinxCoroutines" }
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "kotlinxSerializationJson" }
kotlinx-datetime           = { group = "org.jetbrains.kotlinx", name = "kotlinx-datetime",            version.ref = "kotlinxDatetime" }

# AndroidX Core
androidx-core-ktx          = { group = "androidx.core",     name = "core-ktx",          version.ref = "androidxCore" }
androidx-activity-compose  = { group = "androidx.activity", name = "activity-compose",   version.ref = "androidxActivity" }

# Lifecycle
androidx-lifecycle-runtime-compose  = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose",  version.ref = "androidxLifecycle" }
androidx-lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "androidxLifecycle" }

# Compose (all via BOM — no individual versions)
androidx-compose-bom                = { group = "androidx.compose",    name = "compose-bom",            version.ref = "androidxComposeBom" }
androidx-compose-ui                 = { group = "androidx.compose.ui", name = "ui" }
androidx-compose-ui-graphics        = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-compose-ui-tooling         = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-compose-ui-test-junit4     = { group = "androidx.compose.ui", name = "ui-test-junit4" }
androidx-compose-material3          = { group = "androidx.compose.material3", name = "material3" }
androidx-compose-material3-windowSizeClass = { group = "androidx.compose.material3", name = "material3-window-size-class" }

# Material 3 Adaptive (stable 1.1.0+)
material3-adaptive              = { group = "androidx.compose.material3.adaptive", name = "adaptive",              version.ref = "material3Adaptive" }
material3-adaptive-layout       = { group = "androidx.compose.material3.adaptive", name = "adaptive-layout",       version.ref = "material3Adaptive" }
material3-adaptive-navigation   = { group = "androidx.compose.material3.adaptive", name = "adaptive-navigation",   version.ref = "material3Adaptive" }
material3-adaptive-navigation-suite = { group = "androidx.compose.material3", name = "material3-adaptive-navigation-suite", version.ref = "material3Adaptive" }

# Navigation
androidx-navigation-compose        = { group = "androidx.navigation", name = "navigation-compose",       version.ref = "androidxNavigation" }
androidx-hilt-navigation-compose   = { group = "androidx.hilt",       name = "hilt-navigation-compose",  version.ref = "androidxHiltNavigationCompose" }

# Hilt
hilt-android              = { group = "com.google.dagger", name = "hilt-android",          version.ref = "hilt" }
hilt-android-compiler     = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-android-testing      = { group = "com.google.dagger", name = "hilt-android-testing",  version.ref = "hilt" }
hilt-ext-work             = { group = "androidx.hilt",     name = "hilt-work",             version.ref = "hiltExt" }
hilt-ext-compiler         = { group = "androidx.hilt",     name = "hilt-compiler",         version.ref = "hiltExt" }

# Room
room-runtime              = { group = "androidx.room", name = "room-runtime",  version.ref = "androidxRoom" }
room-ktx                  = { group = "androidx.room", name = "room-ktx",      version.ref = "androidxRoom" }
room-compiler             = { group = "androidx.room", name = "room-compiler", version.ref = "androidxRoom" }

# DataStore
androidx-datastore        = { group = "androidx.datastore", name = "datastore",             version.ref = "androidxDataStore" }
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "androidxDataStore" }

# WorkManager
androidx-work-runtime-ktx = { group = "androidx.work", name = "work-runtime-ktx", version.ref = "androidxWork" }
androidx-work-testing     = { group = "androidx.work", name = "work-testing",     version.ref = "androidxWork" }

# Paging
androidx-paging-runtime   = { group = "androidx.paging", name = "paging-runtime",          version.ref = "androidxPaging" }
androidx-paging-compose   = { group = "androidx.paging", name = "paging-compose",          version.ref = "androidxPaging" }
androidx-paging-testing   = { group = "androidx.paging", name = "paging-testing",          version.ref = "androidxPaging" }

# Image loading — Coil 3 (Compose-first, KMP)
coil-compose              = { group = "io.coil-kt.coil3", name = "coil-compose",         version.ref = "coil" }
coil-network-okhttp       = { group = "io.coil-kt.coil3", name = "coil-network-okhttp",  version.ref = "coil" }

# Networking
retrofit-core                = { group = "com.squareup.retrofit2",   name = "retrofit",                          version.ref = "retrofit" }
retrofit-kotlin-serialization = { group = "com.jakewharton.retrofit", name = "retrofit2-kotlinx-serialization-converter", version.ref = "retrofitKotlinxSerializationJson" }
okhttp-logging               = { group = "com.squareup.okhttp3",      name = "logging-interceptor",               version.ref = "okhttp" }

# Baseline Profiles
androidx-profileinstaller = { group = "androidx.profileinstaller", name = "profileinstaller",   version.ref = "androidxProfileinstaller" }
androidx-macrobenchmark   = { group = "androidx.benchmark",        name = "benchmark-macro-junit4", version.ref = "androidxMacrobenchmark" }

# Testing
junit                     = { group = "junit",             name = "junit",            version.ref = "junit" }
androidx-test-ext         = { group = "androidx.test.ext", name = "junit-ktx",        version.ref = "androidxTestExt" }
androidx-test-runner      = { group = "androidx.test",     name = "runner",           version.ref = "androidxTestRunner" }
turbine                   = { group = "app.cash.turbine",  name = "turbine",          version.ref = "turbine" }
roborazzi                 = { group = "io.github.takahirom.roborazzi", name = "roborazzi", version.ref = "roborazzi" }
roborazzi-compose         = { group = "io.github.takahirom.roborazzi", name = "roborazzi-compose", version.ref = "roborazzi" }

# Build-logic classpath entries
android-gradlePlugin      = { group = "com.android.tools.build", name = "gradle",                version.ref = "androidGradlePlugin" }
kotlin-gradlePlugin       = { group = "org.jetbrains.kotlin",    name = "kotlin-gradle-plugin",  version.ref = "kotlin" }
kotlin-compose-gradlePlugin = { group = "org.jetbrains.kotlin",  name = "compose-compiler-gradle-plugin", version.ref = "kotlin" }
ksp-gradlePlugin          = { group = "com.google.devtools.ksp", name = "com.google.devtools.ksp.gradle.plugin", version.ref = "ksp" }
room-gradlePlugin         = { group = "androidx.room",           name = "room-gradle-plugin",    version.ref = "androidxRoom" }

[plugins]
android-application       = { id = "com.android.application",               version.ref = "androidGradlePlugin" }
android-library           = { id = "com.android.library",                   version.ref = "androidGradlePlugin" }
android-test              = { id = "com.android.test",                      version.ref = "androidGradlePlugin" }
baselineprofile           = { id = "androidx.baselineprofile",              version.ref = "baselineprofile" }
kotlin-android            = { id = "org.jetbrains.kotlin.android",          version.ref = "kotlin" }
kotlin-compose            = { id = "org.jetbrains.kotlin.plugin.compose",   version.ref = "kotlin" }   # Kotlin 2.x
kotlin-jvm                = { id = "org.jetbrains.kotlin.jvm",              version.ref = "kotlin" }
kotlin-serialization      = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
hilt                      = { id = "com.google.dagger.hilt.android",        version.ref = "hilt" }
ksp                       = { id = "com.google.devtools.ksp",               version.ref = "ksp" }
room                      = { id = "androidx.room",                         version.ref = "androidxRoom" }

# Convention plugins (build-logic)
app-android-application   = { id = "app.android.application",         version = "unspecified" }
app-android-library       = { id = "app.android.library",             version = "unspecified" }
app-android-feature       = { id = "app.android.feature",             version = "unspecified" }
app-android-library-compose = { id = "app.android.library.compose",  version = "unspecified" }
app-android-hilt          = { id = "app.android.hilt",                version = "unspecified" }
app-android-room          = { id = "app.android.room",                version = "unspecified" }
app-jvm-library           = { id = "app.jvm.library",                 version = "unspecified" }
```

---

## Convention Plugins (`build-logic/`)

### Library plugin (Kotlin 2.x)

```kotlin
// build-logic/convention/src/main/kotlin/AndroidLibraryConventionPlugin.kt
class AndroidLibraryConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            with(pluginManager) {
                apply("com.android.library")
                apply("org.jetbrains.kotlin.android")
            }
            extensions.configure<LibraryExtension> {
                configureKotlinAndroid(this)
                defaultConfig.targetSdk = 35
                testOptions.animationsDisabled = true
            }
        }
    }
}

// KotlinAndroid.kt — shared Kotlin config
internal fun Project.configureKotlinAndroid(
    commonExtension: CommonExtension<*, *, *, *, *, *>,
) {
    commonExtension.apply {
        compileSdk = 35
        defaultConfig { minSdk = 24 }
        compileOptions {
            sourceCompatibility = JavaVersion.VERSION_17
            targetCompatibility = JavaVersion.VERSION_17
            isCoreLibraryDesugaringEnabled = true  // java.time on older APIs
        }
    }
    extensions.configure<KotlinAndroidProjectExtension> {
        compilerOptions {
            jvmTarget = JvmTarget.JVM_17
            // K2 is default in Kotlin 2.x — no need to opt-in
            freeCompilerArgs.addAll(
                "-opt-in=kotlin.RequiresOptIn",
                "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi",
            )
        }
    }
}
```

### Compose plugin (Kotlin 2.x — no composeOptions needed)

```kotlin
// AndroidComposeConventionPlugin.kt
class AndroidLibraryComposeConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            pluginManager.apply("org.jetbrains.kotlin.plugin.compose")  // Kotlin 2.x bundled
            val extension = extensions.getByType<LibraryExtension>()
            configureAndroidCompose(extension)
        }
    }
}
```

### Feature plugin

```kotlin
class AndroidFeatureConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            pluginManager.apply {
                apply("app.android.library")
                apply("app.android.library.compose")
                apply("app.android.hilt")
            }
            extensions.configure<LibraryExtension> {
                defaultConfig.testInstrumentationRunner =
                    "com.example.core.testing.AppTestRunner"
            }
            dependencies {
                add("implementation", project(":core:ui"))
                add("implementation", project(":core:designsystem"))
                add("implementation", libs.findLibrary("androidx-hilt-navigation-compose").get())
                add("implementation", libs.findLibrary("androidx-lifecycle-runtime-compose").get())
                add("implementation", libs.findLibrary("androidx-lifecycle-viewmodel-compose").get())
                add("implementation", libs.findLibrary("androidx-navigation-compose").get())
                add("testImplementation", project(":core:testing"))
                add("androidTestImplementation", project(":core:testing"))
            }
        }
    }
}
```

### Room plugin (uses Room Gradle Plugin)

```kotlin
class AndroidRoomConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            with(pluginManager) {
                apply("androidx.room")
                apply("com.google.devtools.ksp")
            }
            extensions.configure<RoomExtension> {
                schemaDirectory("$projectDir/schemas")  // export Room schemas for migration testing
            }
        }
    }
}
```

---

## Module Build Files

### App module

```kotlin
plugins {
    alias(libs.plugins.app.android.application)
    alias(libs.plugins.app.android.library.compose)
    alias(libs.plugins.app.android.hilt)
    alias(libs.plugins.baselineprofile)
}

android {
    namespace = "com.example.app"
    defaultConfig {
        applicationId = "com.example.app"
        versionCode = 1
        versionName = "1.0"
    }
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }
}

dependencies {
    implementation(projects.feature.foryou.impl)
    implementation(projects.core.common)
    implementation(projects.core.data)
    implementation(projects.sync.work)
    implementation(libs.androidx.activity.compose)
    implementation(libs.material3.adaptive.navigation.suite)
    // Baseline Profiles runtime
    implementation(libs.androidx.profileinstaller)
    baselineProfile(projects.benchmark)
}
```

### Feature impl module

```kotlin
plugins {
    alias(libs.plugins.app.android.feature)
}

android { namespace = "com.example.feature.topic.impl" }

dependencies {
    api(projects.feature.topic.api)
    implementation(projects.core.data)
}
```

---

## settings.gradle.kts

```kotlin
pluginManagement {
    includeBuild("build-logic")
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "MyApp"
enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

include(":app")
include(":benchmark")
include(":feature:foryou:api", ":feature:foryou:impl")
include(":feature:topic:api",  ":feature:topic:impl")
include(":core:common", ":core:data", ":core:database")
include(":core:datastore", ":core:designsystem", ":core:model")
include(":core:network", ":core:testing", ":core:ui")
include(":sync:work")
```
