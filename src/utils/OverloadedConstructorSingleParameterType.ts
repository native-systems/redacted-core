type Item<T> = T extends [infer A]? A: never

/**
 * Extracts the union of parameter types from up to 6 overloaded constructors.
 * Constructors that accept one argument only are considered.
 * @template T the class type to extract constructor parameters from
 */
export type OverloadedConstructorSingleParameterType<T> =
  T extends {
    new (..._args: infer A): any
    new (..._args: infer B): any
    new (..._args: infer C): any
    new (..._args: infer D): any
    new (..._args: infer E): any
    new (..._args: infer F): any
  } ? Item<A> | Item<B> | Item<C> | Item<D> | Item<E> | Item<F> :
  T extends {
    new (..._args: infer A): any
    new (..._args: infer B): any
    new (..._args: infer C): any
    new (..._args: infer D): any
    new (..._args: infer E): any
  } ? Item<A> | Item<B> | Item<C> | Item<D> | Item<E> :
  T extends {
    new (..._args: infer A): any
    new (..._args: infer B): any
    new (..._args: infer C): any
    new (..._args: infer D): any
  } ? Item<A> | Item<B> | Item<C> | Item<D> :
  T extends {
    new (..._args: infer A): any
    new (..._args: infer B): any
    new (..._args: infer C): any
  } ? Item<A> | Item<B> | Item<C> :
  T extends {
    new (..._args: infer A): any
    new (..._args: infer B): any
  } ? Item<A> | Item<B> :
  T extends {
    new (..._args: infer A): any 
  } ? Item<A> :
  never
