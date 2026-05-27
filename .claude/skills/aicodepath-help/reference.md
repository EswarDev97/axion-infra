# AICodePath Help - Reference

## Detailed Help Content

```json
{
  "commands": {
    "workflow": [
      {
        "command": "/aicodepath:preflight",
        "description": "Run pre-flight checks"
      },
      {
        "command": "/aicodepath:init",
        "description": "Initialize workflow session"
      },
      {
        "command": "/aicodepath:diagnostics",
        "description": "Run system diagnostics"
      }
    ],
    "quality": [
      {
        "command": "/aicodepath:validate",
        "description": "Validate code against guidelines"
      },
      {
        "command": "/ci-lint",
        "description": "Run CI/CD linting checks"
      },
      {
        "command": "/aicodepath:learn",
        "description": "Learn from session corrections"
      }
    ],
    "session": [
      {
        "command": "/aicodepath:status",
        "description": "Show current workflow status"
      },
      {
        "command": "/aicodepath:pause",
        "description": "Pause and save session state"
      },
      {
        "command": "/aicodepath:resume",
        "description": "Resume paused session"
      },
      {
        "command": "/aicodepath:preferences",
        "description": "Show learned preferences"
      }
    ]
  },
  "phases": {
    "pre-flight": "Verify environment, plugins, and MCP servers are ready",
    "inception": "Planning, requirements, user stories, sprint planning",
    "construction": "Design, implementation, testing, code generation",
    "operations": "Deployment, monitoring, sprint tracking"
  },
  "escapeHatches": [
    "// aicodepath: allow-stub - Allow stub/placeholder code",
    "// aicodepath: allow-mock - Allow mock data",
    "// aicodepath: allow-fake - Allow fake logic",
    "// aicodepath: skip-check - Skip specific validation"
  ]
}
```
