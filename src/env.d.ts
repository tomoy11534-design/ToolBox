// .vue ファイルを TypeScript から import できるようにする型宣言
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
