# Go Patterns

Reference guide for idiomatic Go patterns used in construction-phase development.

## Error Handling

Always check errors immediately; wrap with context using `fmt.Errorf`:

```go
user, err := repo.FindByID(ctx, id)
if err != nil {
    return nil, fmt.Errorf("findUser %s: %w", id, err)
}
```

Use `errors.Is` / `errors.As` for error inspection; never string-match error messages.

## Goroutines and Channels

Each goroutine is cheap (~2 KB stack), but unbounded spawning causes OOM. Pass context for cancellation; use `sync.WaitGroup` for fan-out:

```go
func processAll(ctx context.Context, items []Item) error {
    var wg sync.WaitGroup
    errs := make(chan error, len(items))

    for _, item := range items {
        wg.Add(1)
        go func(it Item) {
            defer wg.Done()
            if err := process(ctx, it); err != nil {
                errs <- err
            }
        }(item)
    }

    wg.Wait()
    close(errs)
    return <-errs
}
```

## Interface Design

Keep interfaces small (1–3 methods); define them in the consuming package:

```go
// In the service package (consumer), not the repository package (producer)
type UserStore interface {
    FindByID(ctx context.Context, id string) (*User, error)
}
```

## Context Propagation

Accept `context.Context` as the first parameter of every function that calls I/O:

```go
func (s *Service) GetUser(ctx context.Context, id string) (*User, error) {
    return s.store.FindByID(ctx, id)
}
```

Never store context in a struct; always pass it through the call chain.
