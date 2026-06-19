# ArcGIS Maps SDK for JavaScript Skill

## Overview

You are an expert ArcGIS Maps SDK for JavaScript engineer.

When working with ArcGIS applications:

* Prefer modern ES modules (`@arcgis/core`) over legacy AMD modules.
* Use TypeScript whenever possible.
* Follow ArcGIS reactive patterns instead of polling.
* Avoid memory leaks by removing handles, watchers, and event listeners.
* Favor immutable React state patterns.
* Optimize rendering and layer updates for large datasets.

---

## Core Concepts

### Map Setup

Typical application structure:

```ts
const map = new Map({
  basemap: "topo-vector",
});

const view = new MapView({
  container: containerRef.current,
  map,
  center: [103.8198, 1.3521],
  zoom: 11,
});
```

For 3D:

```ts
const scene = new SceneView({
  container,
  map,
});
```

---

## Layer Management

### Add Layers

```ts
const layer = new FeatureLayer({
  url,
});

map.add(layer);
```

### Visibility

```ts
layer.visible = true;
layer.visible = false;
```

Never remove and recreate a layer simply to toggle visibility.

### Layer Lookup

Prefer IDs:

```ts
const layer = map.findLayerById("aircraft");
```

Avoid:

```ts
map.layers.find(...)
```

unless necessary.

---

## React Integration

### Create View Once

```ts
useEffect(() => {
  const view = new MapView({...});

  return () => {
    view.destroy();
  };
}, []);
```

Avoid recreating MapView on every render.

### Store View References

```ts
const viewRef = useRef<MapView>();
```

Avoid:

```ts
const [view, setView] = useState();
```

unless UI updates depend on it.

---

## Reactive Utilities

### Watch Properties

Use:

```ts
reactiveUtils.watch(
  () => layer.visible,
  (visible) => {
    console.log(visible);
  }
);
```

Instead of:

```ts
layer.watch(...)
```

for new code.

### Wait For Conditions

```ts
await reactiveUtils.when(
  () => !view.updating
);
```

### Cleanup

```ts
const handle = reactiveUtils.watch(...);

return () => handle.remove();
```

Always remove handles.

---

## Graphics

### Add Graphics

```ts
view.graphics.add(graphic);
```

### Batch Operations

Prefer:

```ts
graphicsLayer.addMany(graphics);
```

Over:

```ts
graphics.forEach(g => graphicsLayer.add(g));
```

for large collections.

---

## Hit Testing

```ts
const result = await view.hitTest(event);
```

Common pattern:

```ts
view.on("click", async (event) => {
  const result = await view.hitTest(event);

  const graphic = result.results[0]?.graphic;

  if (!graphic) return;

  openPanel(graphic.attributes.id);
});
```

---

## Pointer Cursor

Use:

```ts
view.on("pointer-move", async (event) => {
  const hit = await view.hitTest(event);

  view.container.style.cursor =
    hit.results.length > 0
      ? "pointer"
      : "default";
});
```

For heavy applications, throttle hit tests.

---

## LayerView Usage

Access rendering state through LayerViews:

```ts
const layerView =
  await view.whenLayerView(layer);
```

Common checks:

```ts
layerView.updating
```

```ts
layerView.suspended
```

---

## Filtering

### Feature Filter

```ts
layerView.filter = {
  where: "status = 'ACTIVE'"
};
```

### Feature Effect

```ts
layerView.featureEffect = {
  filter: {
    where: "priority = 'HIGH'"
  },
  excludedEffect: "grayscale(100%) opacity(30%)"
};
```

---

## Performance

### Preferred

* FeatureLayer
* SceneLayer
* VectorTileLayer

### Avoid

* Thousands of individual Graphics
* Frequent layer recreation
* Excessive reactive watchers
* Unbounded hit testing

### For Large Datasets

* Use server-side filtering.
* Use definition expressions.
* Use FeatureLayer instead of GraphicsLayer.
* Use clustering when possible.

---

## Queries

### Query Features

```ts
const query = layer.createQuery();

query.where = "1=1";

const result =
  await layer.queryFeatures(query);
```

### Count Features

```ts
const count =
  await layer.queryFeatureCount(query);
```

Prefer count queries over downloading features.

---

## Abort Controllers

Long-running requests should support cancellation.

```ts
const controller =
  new AbortController();

const result =
  await layer.queryFeatures(query, {
    signal: controller.signal,
  });
```

Cleanup:

```ts
controller.abort();
```

---

## Time Awareness

```ts
view.timeExtent = {
  start,
  end,
};
```

Prefer updating time extents rather than rebuilding layers.

---

## Event Cleanup

Always remove:

```ts
const handle = view.on(...);

handle.remove();
```

and

```ts
const watchHandle =
  reactiveUtils.watch(...);

watchHandle.remove();
```

during component unmount.

---

## Common Anti-Patterns

### Bad

```ts
map.remove(layer);
map.add(layer);
```

to refresh data.

### Good

```ts
layer.refresh();
```

---

### Bad

```ts
setState(layer.visible);
```

inside dozens of watchers.

````

### Good

Maintain a single source of truth.

---

### Bad

```ts
view.hitTest(...)
````

on every pointer event without throttling.

### Good

Debounce or throttle hover interactions.

---

## Testing

Mock ArcGIS modules.

Example:

```ts
jest.mock("@arcgis/core/views/MapView");
```

Avoid creating real MapView instances in unit tests.

Test:

* Layer visibility logic
* Query generation
* Geometry calculations
* React hooks

Do not test ArcGIS internals.

---

## Production Guidelines

1. Create the MapView once.
2. Destroy the MapView on cleanup.
3. Remove all watchers.
4. Remove all event handlers.
5. Prefer FeatureLayer over GraphicsLayer.
6. Use reactiveUtils instead of polling.
7. Query counts instead of full feature downloads where possible.
8. Use AbortController for async operations.
9. Avoid layer recreation.
10. Keep ArcGIS state separate from React rendering state.
