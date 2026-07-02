import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

type ModuleLoader<T extends ComponentType<unknown>> = () => Promise<{ default: T }>

export type PreloadableComponent<T extends ComponentType<unknown>> = LazyExoticComponent<T> & {
  preload: () => Promise<{ default: T }>
}

export function lazyWithPreload<T extends ComponentType<unknown>>(
  loader: ModuleLoader<T>,
): PreloadableComponent<T> {
  let preloadPromise: ReturnType<ModuleLoader<T>> | undefined

  const load = () => {
    preloadPromise ??= loader()
    return preloadPromise
  }

  const Component = lazy(() => load()) as PreloadableComponent<T>
  Component.preload = load
  return Component
}
