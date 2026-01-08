/**
 * Squared loss pool adjacent violators
 * 
 * Given an array of blocks having a preferred position and fixed size, computes
 * the array of positions such that the sum of squared losses (distance between
 * preferred and computed position) is minimized. Items must be ordered by
 * ascending preferred position.
 * @param blocks the blocks whose optimal positions will be computed
 * @returns the computed optimal positions
 * @see {@link https://en.wikipedia.org/wiki/Isotonic_regression}
 */
export const L2PAV = (
  blocks: Array<{ position: number, size: number }>
): number[] => {
  const N = blocks.length
  const t = Array(N).fill(0)
  const q = Array(N)
  for (let i = 1; i < N; i++)
    t[i] = t[i - 1] + blocks[i - 1].size
  for (let i = 0; i < N; i++)
    q[i] = blocks[i].position - t[i]
  const values: number[] = []
  const counts: number[] = []
  const indices: number[][] = []
  for (let i = 0; i < N; i++) {
    values.push(q[i])
    counts.push(1)
    indices.push([i])
    while (
      values.length >= 2
      && (values.at(-2) as number) > (values.at(-1) as number)
    ) {
      const v2 = values.pop() as number
      const c2 = counts.pop() as number
      const i2 = indices.pop() as number[]
      const v1 = values.pop() as number
      const c1 = counts.pop() as number
      const i1 = indices.pop() as number[]
      const c = c1 + c2
      const v = (v1 * c1 + v2 * c2) / c
      values.push(v)
      counts.push(c)
      indices.push(i1.concat(i2))
    }
  }
  const x = Array(N)
  for (let i = 0; i < values.length; i++)
    indices[i].forEach(j => x[j] = values[i] + t[j]);
  return x
}
