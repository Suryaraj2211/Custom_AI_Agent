# React Knowledge Base

## Hooks

### useState - State Management
```tsx
const [count, setCount] = useState(0);

// Functional update (for state based on previous)
setCount(prev => prev + 1);

// Object state (always spread)
const [user, setUser] = useState({ name: '', age: 0 });
setUser(prev => ({ ...prev, name: 'John' }));
```

### useEffect - Side Effects
```tsx
useEffect(() => {
    // Effect runs after render
    const subscription = api.subscribe();
    
    return () => {
        // Cleanup on unmount or before re-run
        subscription.unsubscribe();
    };
}, [dependency]); // Only re-run if dependency changes
```

**Common Mistakes:**
- Empty array `[]` = run once on mount
- No array = run every render (usually wrong)
- Missing dependencies = stale closures

### useMemo - Expensive Calculations
```tsx
const expensiveResult = useMemo(() => {
    return heavyComputation(data);
}, [data]);
```

### useCallback - Stable Function References
```tsx
const handleClick = useCallback(() => {
    doSomething(id);
}, [id]);
```

## Component Patterns

### Composition over Inheritance
```tsx
// Good: Composition
function Card({ children, header }) {
    return (
        <div className="card">
            <div className="card-header">{header}</div>
            <div className="card-body">{children}</div>
        </div>
    );
}
```

## Performance

### React.memo - Prevent Re-renders
```tsx
const ExpensiveComponent = React.memo(({ data }) => {
    return <HeavyVisualization data={data} />;
});
```

## Common Errors

### "Cannot update component while rendering"
- Don't call setState during render
- Move to useEffect or event handler

### "Too many re-renders"
- setState in render without condition
- Dependency array causing infinite loop
