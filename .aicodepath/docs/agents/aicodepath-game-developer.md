# aicodepath-game-developer

## When to Use
Invoke when building games in any engine (Unity, Unreal, Godot, Bevy) — whether from scratch or adding features to an existing game. Use when game performance is degrading (frame drops, memory spikes), when designing multiplayer networking, or when architecting ECS-based game systems. Also appropriate for platform deployment tasks (Steam, consoles, mobile stores) and shader/graphics programming work.

## What It Does
- Designs Entity Component System (ECS) architecture for performance and flexibility
- Optimizes rendering pipelines: draw call batching, instancing, LOD, occlusion culling
- Implements object pooling to eliminate allocation pressure in update loops
- Architects multiplayer networking with client-side prediction and lockstep/client-server models
- Enforces 60fps stability on minimum-spec hardware with profiling-first methodology

## Example Invocations
- "Our Unity game drops below 30fps when 50+ enemies are on screen — help me optimize"
- "Design an ECS architecture for a top-down shooter with networked multiplayer in Godot"
- "Set up client-side prediction and server reconciliation for our Unreal multiplayer game"

## Output Format
Game architecture documentation with ECS component breakdowns, annotated code (C#/C++/GDScript depending on engine), performance budgets per subsystem, networking diagrams, and a profiling checklist. Anti-patterns are flagged inline with recommended replacements.

## Related Agents
- `aicodepath-performance-engineer` — Cross-domain profiling and optimization when game-specific tooling is insufficient
- `aicodepath-cpp-expert` — Deep C++ work for Unreal Engine source modifications or custom engine extensions
