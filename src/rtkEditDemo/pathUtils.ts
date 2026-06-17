export function getIn(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

/** Walks every leaf (non-object, non-array) value in obj and yields [dotPath, value] pairs. */
export function* walkLeafPaths(
  obj: unknown,
  prefix = '',
): Generator<[string, unknown]> {
  if (obj == null || typeof obj !== 'object') {
    yield [prefix, obj]
    return
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      yield* walkLeafPaths(obj[i], prefix ? `${prefix}.${i}` : String(i))
    }
    return
  }
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    yield* walkLeafPaths(val, prefix ? `${prefix}.${key}` : key)
  }
}

/** Convert a partial nested update object to a flat { dotPath: value } record.
 *  Skips undefined values so sparse arrays can be used to target specific indices. */
export function flattenUpdate(update: unknown, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [path, value] of walkLeafPaths(update, prefix)) {
    if (value !== undefined) result[path] = value
  }
  return result
}

/** Immutably set a value at a dot-path in a nested object/array structure. */
export function setIn<T>(root: T, path: string, value: unknown): T {
  const keys = path.split('.')
  function set(current: unknown, depth: number): unknown {
    if (depth === keys.length) return value
    const key = keys[depth]
    if (Array.isArray(current)) {
      const idx = Number(key)
      const next = [...current]
      next[idx] = set(current[idx], depth + 1)
      return next
    }
    const obj = (current != null && typeof current === 'object' ? current : {}) as Record<string, unknown>
    return { ...obj, [key]: set(obj[key], depth + 1) }
  }
  return set(root, 0) as T
}
