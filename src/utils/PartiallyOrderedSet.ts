class GraphNode<K> {
  public readonly upstream: Set<K>
  public readonly downstream: Set<K>

  constructor () {
    this.upstream = new Set()
    this.downstream = new Set()
  }
}

class Graph<K> {
  private readonly nodes: Map<K, GraphNode<K>>
  private readonly roots: Set<K>

  constructor () {
    this.nodes = new Map()
    this.roots = new Set()
  }

  public addNode (key: K): boolean {
    if (this.nodes.has(key))
      return false
    this.nodes.set(key, new GraphNode<K>())
    this.roots.add(key)
    return true
  }

  public removeNode (key: K): boolean {
    if (this.nodes.has(key)) {
      const nodeToRemove = this.nodes.get(key)!
      for (const downstreamKey of nodeToRemove.downstream)
        this.nodes.get(downstreamKey)!.upstream.delete(key)
      nodeToRemove.downstream.clear()
      for (const upstreamKey of nodeToRemove.upstream)
        this.nodes.get(upstreamKey)!.downstream.delete(key)
      nodeToRemove.upstream.clear()
      this.roots.delete(key)
      this.nodes.delete(key)
      return true
    }
    return  false
  }

  public addEdge (a: K, b: K): boolean {
    if (!this.hasCycle(a, this.nodes, this.nodes.get(b)!.upstream))
      return false
    if (!this.nodes.has(a))
      this.nodes.set(a, new GraphNode<K>())
    this.nodes.get(a)!.upstream.add(b)
    this.nodes.get(b)!.downstream.add(a)
    this.roots.delete(b)
    return true
  }

  public *iterator () {
    const intermediateRoots = new Set<K>(this.roots.values())
    const downstreamCounters = new Map<K, number>()
    while (intermediateRoots.size) {
      const key = intermediateRoots.values().next().value!
      yield key
      for (const upstreamKey of this.nodes.get(key)!.upstream) {
        if (!downstreamCounters.has(upstreamKey))
          downstreamCounters.set(
            upstreamKey,
            this.nodes.get(upstreamKey)!.downstream.size
          )
        const referenceCount = downstreamCounters.get(upstreamKey)! - 1
        if (!referenceCount)
          intermediateRoots.add(upstreamKey)
        downstreamCounters.set(upstreamKey, referenceCount)
      }
      intermediateRoots.delete(key)
    }
  }

  private hasCycle (
    root: K,
    nodes: Map<K, GraphNode<K>>,
    nodesToVerify: Set<K>
  ): boolean {
    if (nodesToVerify.has(root))
      return false
    for (const element of nodesToVerify) {
      if (!this.hasCycle(root, nodes, nodes.get(element)!.upstream))
        return false
    }
    return true
  }
}

/**
 * Implements a `Set` in which elements can or not be bound by some relationship
 * e.g. `a < b`. This type is not designed to be mathematically accurate or
 * efficient performance-wise and is merely designed as a practical tool to
 * sort small sets. It actually is a set coupled with a directed acyclic graph;
 * elements of the set can be associated with elements from the graph (the keys)
 * on which the order relationships apply. Ordering is done manually.
 * @template T the set's elements type
 * @template K the set's keys type
 */
export class PartiallyOrderedSet<T, K> extends Set<T> {
  private readonly graph: Graph<K>
  private readonly keyToElementMap: Map<K, T>

  constructor (values?: readonly T[] | null) {
    super(values)
    this.graph = new Graph()
    this.keyToElementMap = new Map()
  }

  /**
   * Adds a new key.
   * @param key the key to add
   * @returns true if the key was unexistant and created; false otherwise
   */
  public addKey (key: K): boolean {
    return this.graph.addNode(key)
  }

  /**
   * Deletes a key.
   * @param key the key to delete
   * @returns true if the key was found and deleted; false otherwise
   */
  public removeKey (key: K): boolean {
    return this.graph.removeNode(key)
  }

  /**
   * Assigns an element of the set to a specific key.
   * @param element the element to bind to the key
   * @param key the key to associate the element with
   */
  public bindKey (element: T, key: K): void {
    this.keyToElementMap.set(key, element)
  }

  /**
   * Defines an order relationship between two keys. If the operation leads to
   * a cycle in the graph, it fails and returns `false`.
   * @param a the "lower" key
   * @param b the "upper" key
   * @returns true if the relationship was created; false otherwise
   */
  public order (a: K, b: K): boolean {
    return this.graph.addEdge(a, b)
  }

  /**
   * Returns a `SetIterator` which can be used to iterate through the set while
   * respecting the order relationships.
   * @returns a set iterator on the set's elements
   */
  public sortedValues (): SetIterator<T> {
    const generator = function* (this: PartiallyOrderedSet<T, K>) {
      for (const key of this.graph.iterator())
        if (this.keyToElementMap.has(key))
          yield this.keyToElementMap.get(key)
    }.bind(this)
    return {
      next: generator().next,
      [Symbol.iterator]: generator
    } as SetIterator<T>
  }

  /**
   * Returns a `SetIterator` which can be used to iterated through the keys
   * while respecting the order relationships.
   * @returns a set iterator on the set's keys
   */
  public sortedKeys (): SetIterator<K> {
    return {
      next: this.graph.iterator().next,
      [Symbol.iterator]: this.graph.iterator
    } as SetIterator<K>
  }
}
