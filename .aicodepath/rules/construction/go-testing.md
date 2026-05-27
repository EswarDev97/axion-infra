# Go Testing

Reference guide for testing Go code.

## Table-Driven Tests

Use subtests with `t.Run` for clear failure output:

```go
func TestFormatUser(t *testing.T) {
    cases := []struct {
        name     string
        input    User
        expected string
    }{
        {"full name", User{First: "Alice", Last: "Smith"}, "Alice Smith"},
        {"trim spaces", User{First: " Alice ", Last: "Smith"}, "Alice Smith"},
    }

    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            got := FormatUser(tc.input)
            if got != tc.expected {
                t.Errorf("got %q, want %q", got, tc.expected)
            }
        })
    }
}
```

## httptest

Test HTTP handlers without a network:

```go
func TestGetUser(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/users/1", nil)
    w := httptest.NewRecorder()

    handler := NewUserHandler(mockStore)
    handler.ServeHTTP(w, req)

    if w.Code != http.StatusOK {
        t.Fatalf("expected 200, got %d", w.Code)
    }
}
```

## Benchmarks

```go
func BenchmarkFormatUser(b *testing.B) {
    u := User{First: "Alice", Last: "Smith"}
    for i := 0; i < b.N; i++ {
        FormatUser(u)
    }
}
```

Run: `go test -bench=. -benchmem ./...`

## testify

```go
assert.Equal(t, expected, actual)
require.NoError(t, err)  // stops test on failure
```

## gomock

Generate mocks: `mockgen -source=store.go -destination=mock_store.go`

```go
ctrl := gomock.NewController(t)
defer ctrl.Finish()
store := mock.NewMockUserStore(ctrl)
store.EXPECT().FindByID(gomock.Any(), "1").Return(&User{}, nil)
```
