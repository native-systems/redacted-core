import { CompositeKeyMap } from "./CompositeKeyMap"


type CacheEntry<V> = {
  earlyListeners: Set<((value: V) => void)>
  result?: V
}

/**
 * Implements a generic function cache.
 * @template K the union of types of the cached function parameters
 * @template V the function return type
 */
export class Cache<K, V> {
  map: CompositeKeyMap<K, CacheEntry<V>>

  constructor () {
    this.map = new CompositeKeyMap()
  }

  /**
   * Calls a function `load` with the value bound to the specified composite
   * key. If the value does not exist yet, defers the execution of `load` and
   * runs a `callback` function that will compute the value. The `callback`
   * function calls `set` to cache the value or `unset` to delete it from the
   * cache.  
   * @param compositeKey the composite cache key
   * @param load the function that will be executed when the value is computed
   * @param callback the function that will be run once to compute the value
   */
  runOnce (
    compositeKey: K[],
    load: (value: V) => void,
    callback: (set: (value: V) => void, unset: () => void) => void
  ) {
    const entry = this.map.get(compositeKey)
    if (entry) {
      if (entry.result)
        load(entry.result)
      else
        entry.earlyListeners.add(load)
      return
    }
    this.map.set(compositeKey, { earlyListeners: new Set(), result: undefined })
    callback(
      (result) => {
        const entry = this.map.get(compositeKey)
        if (!entry)
          throw new Error("Cache entry was deleted from the cache illegally")
        entry.result = result
        load(result)
        entry.earlyListeners.forEach((set) => set(result))
      },
      () => this.map.delete(compositeKey)
    )
  }
}
