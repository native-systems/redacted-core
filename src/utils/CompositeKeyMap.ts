/**
 * Implements a map that accept composite keys.
 * @template K the union of types of key components
 * @template V the value type
 */
export class CompositeKeyMap<K, V> {
  map: Map<K, CompositeKeyMap<K, V> | V>

  constructor () {
    this.map = new Map()
  }

  /**
   * Tests whether the specified composite key exists.
   * @param compositeKey the composite key to check
   * @returns true if the key exists, false otherwise
   */
  has (compositeKey: K[]): boolean {
    const [key, ...next] = compositeKey
    if (!this.map.has(key))
      return false
    if (!next.length)
      return true
    return (this.map.get(key) as CompositeKeyMap<K, V>).has(next)
  }

  /**
   * Returns the value associated with the specified key.
   * @param compositeKey the composite key to get the value it is associated to
   * @returns the desired value or `undefined` if the key does not exist
   */
  get (compositeKey: K[]): V | undefined {
    const [key, ...next] = compositeKey
    if (!next.length)
      return this.map.get(key) as V
    const subMap = this.map.get(key) as CompositeKeyMap<K, V> | undefined
    return subMap?.get(next)
  }

  /**
   * Sets a value for the given key.
   * @param compositeKey the composite key
   * @param value the associated value
   */
  set (compositeKey: K[], value: V): void {
    const [key, ...next] = compositeKey
    if (!next.length) {
      this.map.set(key, value)
      return
    }
    if (!this.map.has(key))
      this.map.set(key, new CompositeKeyMap<K, V>())
    const subMap = this.map.get(key) as CompositeKeyMap<K, V>
    subMap.set(next, value)
  }

  /**
   * Deletes the specified key.
   * @param compositeKey the key to remove from the map
   * @returns the size of the map (used internally to recursively remove keys)
   */
  delete (compositeKey: K[]): number {
    const [key, ...next] = compositeKey
    const subMap = this.map.get(key) as CompositeKeyMap<K, V> | undefined
    if (!next.length)
      this.map.delete(key)
    else if (!subMap?.delete(next))
      this.map.delete(key)
    return this.map.size
  }
}
