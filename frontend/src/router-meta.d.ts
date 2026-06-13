import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    categoryScope?: boolean
    fullWidth?: boolean
    hideHeader?: boolean
  }
}
