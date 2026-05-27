#!/usr/bin/env python3
"""
Feature Module Generator for Android projects (NowInAndroid patterns, 2025).

Generates api + impl submodules with:
  - @Serializable type-safe navigation routes (Navigation 2.8+)
  - ViewModel with StateFlow + stateIn
  - Sealed UiState + Action interfaces
  - Route-Screen split composables
  - Hilt DI module
  - NavGraphBuilder extension

Usage:
    python generate_feature.py <feature-name> --package <pkg> --path <project-root>

Example:
    python generate_feature.py user-profile --package com.example.app --path /workspace/MyApp
"""

import os
import sys
import argparse
from pathlib import Path


# ── Name conversion helpers ──────────────────────────────────────────────────

def to_pascal(name: str) -> str:
    return ''.join(w.capitalize() for w in name.replace('-', '_').split('_'))


def to_camel(name: str) -> str:
    p = to_pascal(name)
    return p[0].lower() + p[1:] if p else ''


def to_module_dir(name: str) -> str:
    """featureName or feature-name → featurename (no separators)"""
    return name.replace('-', '').replace('_', '')


# ── File generators ──────────────────────────────────────────────────────────

def api_build_gradle(feature_dir: str) -> str:
    return f"""\
plugins {{
    alias(libs.plugins.app.android.library)
    alias(libs.plugins.kotlin.serialization)
}}

android {{
    namespace = "com.example.feature.{feature_dir}.api"
}}

dependencies {{
    api(projects.core.model)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.androidx.navigation.compose)
}}
"""


def api_navigation(name: str, pkg: str) -> str:
    pascal = to_pascal(name)
    mod = to_module_dir(name)
    camel = to_camel(name)
    return f"""\
package {pkg}.feature.{mod}.api

import androidx.navigation.NavController
import androidx.navigation.NavOptions
import kotlinx.serialization.Serializable

/**
 * Type-safe navigation route for {pascal} (Navigation 2.8+).
 * Add fields here for arguments — e.g. `data class {pascal}Route(val id: String)`.
 */
@Serializable
data object {pascal}Route

fun NavController.navigateTo{pascal}(navOptions: NavOptions? = null) {{
    navigate({pascal}Route, navOptions)
}}
"""


def impl_build_gradle(name: str, pkg: str) -> str:
    mod = to_module_dir(name)
    return f"""\
plugins {{
    alias(libs.plugins.app.android.feature)
    // alias(libs.plugins.app.android.library.compose)  // included via feature plugin
}}

android {{
    namespace = "{pkg}.feature.{mod}.impl"
}}

dependencies {{
    api(projects.feature.{mod}.api)
    implementation(projects.core.data)
}}
"""


def ui_state(name: str, pkg: str) -> str:
    pascal = to_pascal(name)
    mod = to_module_dir(name)
    return f"""\
package {pkg}.feature.{mod}.impl

sealed interface {pascal}UiState {{
    data object Loading : {pascal}UiState

    data class Success(
        val items: List<String> = emptyList(),  // TODO: replace with real domain model
    ) : {pascal}UiState

    data class Error(
        val message: String,
    ) : {pascal}UiState
}}

sealed interface {pascal}Action {{
    data class ItemClicked(val id: String) : {pascal}Action
    data object RefreshRequested : {pascal}Action
}}
"""


def view_model(name: str, pkg: str) -> str:
    pascal = to_pascal(name)
    mod = to_module_dir(name)
    return f"""\
package {pkg}.feature.{mod}.impl

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class {pascal}ViewModel @Inject constructor(
    // TODO: inject repository, e.g.: private val repository: MyRepository,
) : ViewModel() {{

    val uiState: StateFlow<{pascal}UiState> = flow {{
        // TODO: replace with actual repository flow
        // repository.getItems().map {{ {pascal}UiState.Success(it) }}
        emit({pascal}UiState.Success(items = listOf("Placeholder item")))
    }}
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = {pascal}UiState.Loading,
        )

    fun onAction(action: {pascal}Action) {{
        when (action) {{
            is {pascal}Action.ItemClicked -> handleItemClicked(action.id)
            {pascal}Action.RefreshRequested -> refresh()
        }}
    }}

    private fun handleItemClicked(id: String) {{
        // TODO
    }}

    private fun refresh() {{
        // TODO
    }}
}}
"""


def screen(name: str, pkg: str) -> str:
    pascal = to_pascal(name)
    mod = to_module_dir(name)
    return f"""\
package {pkg}.feature.{mod}.impl

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

// Route: wires ViewModel — not directly testable but minimal logic
@Composable
internal fun {pascal}Route(
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: {pascal}ViewModel = hiltViewModel(),
) {{
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    {pascal}Screen(
        uiState = uiState,
        onAction = viewModel::onAction,
        onBackClick = onBackClick,
        modifier = modifier,
    )
}}

// Screen: pure UI — testable without Hilt
@Composable
internal fun {pascal}Screen(
    uiState: {pascal}UiState,
    onAction: ({pascal}Action) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier,
) {{
    when (uiState) {{
        {pascal}UiState.Loading -> Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {{
            CircularProgressIndicator()
        }}

        is {pascal}UiState.Error -> Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {{
            Text(text = uiState.message, color = MaterialTheme.colorScheme.error)
        }}

        is {pascal}UiState.Success -> LazyColumn(
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
        ) {{
            items(uiState.items, key = {{ it }}) {{ item ->
                Text(
                    text = item,
                    modifier = Modifier.padding(vertical = 8.dp),
                )
            }}
        }}
    }}
}}
"""


def navigation(name: str, pkg: str) -> str:
    pascal = to_pascal(name)
    mod = to_module_dir(name)
    camel = to_camel(name)
    return f"""\
package {pkg}.feature.{mod}.impl

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import {pkg}.feature.{mod}.api.{pascal}Route

fun NavGraphBuilder.{camel}Screen(
    onBackClick: () -> Unit,
) {{
    composable<{pascal}Route> {{
        {pascal}Route(onBackClick = onBackClick)
    }}
}}
"""


def hilt_module(name: str, pkg: str) -> str:
    pascal = to_pascal(name)
    mod = to_module_dir(name)
    return f"""\
package {pkg}.feature.{mod}.impl.di

import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/**
 * Hilt DI module for {pascal} feature.
 * Add @Binds / @Provides here for feature-specific dependencies.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class {pascal}Module
"""


# ── Module generation ────────────────────────────────────────────────────────

def create(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')
    print(f"  ✅  {path}")


def generate(name: str, pkg: str, project_root: Path) -> None:
    mod = to_module_dir(name)
    pkg_path = Path(pkg.replace('.', '/'))

    api_root = project_root / 'feature' / mod / 'api'
    impl_root = project_root / 'feature' / mod / 'impl'
    api_src = api_root / 'src' / 'main' / 'kotlin' / pkg_path / 'feature' / mod / 'api'
    impl_src = impl_root / 'src' / 'main' / 'kotlin' / pkg_path / 'feature' / mod / 'impl'

    pascal = to_pascal(name)

    print(f"\n🚀  Generating feature: {name}")
    print(f"    package: {pkg}")
    print(f"    path:    {project_root}\n")

    # api module
    create(api_root / 'build.gradle.kts', api_build_gradle(mod))
    create(api_src / f'{pascal}Navigation.kt', api_navigation(name, pkg))

    # impl module
    create(impl_root / 'build.gradle.kts', impl_build_gradle(name, pkg))
    create(impl_src / f'{pascal}UiState.kt', ui_state(name, pkg))
    create(impl_src / f'{pascal}ViewModel.kt', view_model(name, pkg))
    create(impl_src / f'{pascal}Screen.kt', screen(name, pkg))
    create(impl_src / f'{pascal}Navigation.kt', navigation(name, pkg))
    create(impl_src / 'di' / f'{pascal}Module.kt', hilt_module(name, pkg))

    print(f"\n✅  Done!  Next steps:")
    print(f"  1. Add to settings.gradle.kts:")
    print(f'       include(":feature:{mod}:api", ":feature:{mod}:impl")')
    print(f"  2. Add to app/build.gradle.kts:")
    print(f'       implementation(projects.feature.{mod}.impl)')
    print(f"  3. Wire navigation in your NavHost:")
    print(f'       {to_camel(name)}Screen(onBackClick = navController::popBackStack)')


# ── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description='Generate a NowInAndroid-style feature module (api + impl).',
    )
    parser.add_argument('name', help='Feature name in kebab-case, e.g. user-profile')
    parser.add_argument('--package', required=True, help='Base package, e.g. com.example.app')
    parser.add_argument('--path', required=True, help='Project root directory')
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.exists():
        print(f'❌  Project path does not exist: {root}', file=sys.stderr)
        sys.exit(1)

    generate(args.name, args.package, root)


if __name__ == '__main__':
    main()
