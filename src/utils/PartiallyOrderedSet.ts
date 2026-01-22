class PartiallyOrderedSetGraphNode<T> {
  public readonly upstream: Set<T>
  public readonly downstream: Set<T>

  constructor () {
    this.upstream = new Set()
    this.downstream = new Set()
  }
}

/**
 * Implements a `Set` in which elements can or not be bound by some relationship
 * e.g. `a < b`.
 * @template T the set's elements type
 */
export class PartiallyOrderedSet<T> {
  private readonly nodes: Map<T, PartiallyOrderedSetGraphNode<T>>
  private readonly roots: Set<T>

  constructor () {
    this.nodes = new Map()
    this.roots = new Set()
  }

  /**
   * Determines whether the set contains a specified element.
   * @param element the element to find
   * @returns `true` if the set contains the element, `false` otherwise
   */
  public has (element: T): boolean {
    return this.nodes.has(element)
  }

  /**
   * Adds a new element to the set.
   * @param element the element to add
   * @returns the set
   */
  public add (element: T): this {
    if (this.nodes.has(element))
      return this
    this.nodes.set(element, new PartiallyOrderedSetGraphNode<T>())
    this.roots.add(element)
    return this
  }

  /**
   * Removes an element from the set.
   * @param element the element to remove
   * @returns `true` if the element was deleted, `false` otherwise
   */
  public delete (element: T): boolean {
    if (this.nodes.has(element)) {
      const nodeToRemove = this.nodes.get(element)!
      for (const downstreamKey of nodeToRemove.downstream)
        this.nodes.get(downstreamKey)!.upstream.delete(element)
      nodeToRemove.downstream.clear()
      for (const upstreamKey of nodeToRemove.upstream)
        this.nodes.get(upstreamKey)!.downstream.delete(element)
      nodeToRemove.upstream.clear()
      this.roots.delete(element)
      this.nodes.delete(element)
      return true
    }
    return  false
  }

  /**
   * Defines an order relationship between two elements. If the operation leads
   * to a cycle in the graph, it fails and returns `false`.
   * @param a the "lower" element
   * @param b the "upper" element
   * @returns `true` if the relationship was created; `false` otherwise
   */
  public order (a: T, b: T): boolean {
    if (!this.nodes.has(a) || !this.nodes.has(b))
      return false
    if (this.hasCycle(a, this.nodes, this.nodes.get(b)!.upstream))
      return false
    if (!this.nodes.has(a))
      this.nodes.set(a, new PartiallyOrderedSetGraphNode<T>())
    this.nodes.get(a)!.upstream.add(b)
    this.nodes.get(b)!.downstream.add(a)
    this.roots.delete(b)
    return true
  }

  /**
   * Returns a `SetIterator` which can be used to iterate through the set while
   * respecting the order relationships.
   * @returns a set iterator on the set's elements
   */
  public sortedValues (): SetIterator<T> {
    const generator = function* (this: PartiallyOrderedSet<T>) {
      yield* this.iterator()
    }.bind(this)
    return {
      next: generator().next,
      [Symbol.iterator]: generator
    } as SetIterator<T>
  }

  private *iterator () {
    const intermediateRoots = new Set<T>(this.roots.values())
    const downstreamCounters = new Map<T, number>()
    while (intermediateRoots.size) {
      const element = intermediateRoots.values().next().value!
      yield element
      for (const upstreamKey of this.nodes.get(element)!.upstream) {
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
      intermediateRoots.delete(element)
    }
  }

  private hasCycle (
    root: T,
    nodes: Map<T, PartiallyOrderedSetGraphNode<T>>,
    nodesToVerify: Set<T>
  ): boolean {
    if (nodesToVerify.has(root))
      return true
    for (const element of nodesToVerify) {
      if (this.hasCycle(root, nodes, nodes.get(element)!.upstream))
        return true
    }
    return false
  }
}
