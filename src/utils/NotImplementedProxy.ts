export const NotImplementedProxy = (message: string) => new Proxy({}, {
  get() {
    throw new Error(message)
  }
})
