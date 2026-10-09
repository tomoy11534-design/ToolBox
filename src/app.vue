<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// アプリ定義の型
interface AppInfo {
  id: string
  icon: string
  name: string
  description: string
  tech: string[]
  url: string
  color: [string, string] // グラデーションの開始色・終了色
}

// メモ・TODO 1件の型
interface Todo {
  id: number
  text: string
  done: boolean
}

// 登録するアプリの一覧（url は公開先に合わせて書き換える）
const apps: AppInfo[] = [
  {
    id: 'stocksnap',
    icon: '📦',
    name: 'StockSnap',
    description: '日用品在庫管理 ＆ Claude API発注提案',
    tech: ['Python', 'FastAPI'],
    url: 'https://inventory-ai-advisor.onrender.com/',
    color: ['#38bdf8', '#2563eb'],
  },
  {
    id: 'kakeivoice',
    icon: '🎙️',
    name: 'KakeiVoice',
    description: '音声家計簿PWA',
    tech: ['Next.js', 'TypeScript'],
    url: 'https://kakeivoice.web.app',
    color: ['#f472b6', '#db2777'],
  },
  {
    id: 'recifridge',
    icon: '🧊',
    name: 'ReciFridge',
    description: '冷蔵庫の食材・レシピ管理',
    tech: ['Node.js', 'Express'],
    url: 'https://recifridge.vercel.app/',
    color: ['#34d399', '#059669'],
  },
  {
    id: 'pocketsub',
    icon: '💳',
    name: 'PocketSub',
    description: 'サブスク一元管理 ＆ 支出見直し',
    tech: ['Go', 'PostgreSQL'],
    url: 'https://pocket-sub-198499711207.asia-northeast1.run.app/',
    color: ['#a78bfa', '#7c3aed'],
  },
  {
    id: 'kitchenlab',
    icon: '🍳',
    name: 'Kitchen LAB',
    description: '料理教室のサイト',
    tech: ['HTML', 'CSS', 'JavaScript', 'jQuery'],
    url: 'https://recipetm.vercel.app/',
    color: ['#fbbf24', '#ea580c'],
  },
]

// ===== localStorage ヘルパー（使えない環境でも落ちないようにする） =====
const PIN_KEY = 'my-ipad-portal:pinned'
const TODO_KEY = 'my-ipad-portal:todos'

// 中身の形は呼び出し側で確認するため unknown で返す
const load = (key: string, fallback: unknown): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 保存できない場合は何もしない
  }
}

// ===== 状態 =====
const query = ref('')
const savedPins = load(PIN_KEY, [])
const pinnedIds = ref<string[]>(Array.isArray(savedPins) ? savedPins : [])
// アプリIDごとのTODO一覧 { [appId]: [{ id, text, done }] }
const savedTodos = load(TODO_KEY, {})
const todos = ref<Record<string, Todo[]>>(
  savedTodos && typeof savedTodos === 'object' ? (savedTodos as Record<string, Todo[]>) : {},
)
// アプリIDごとの入力中テキスト
const drafts = ref<Record<string, string>>({})

// 変更のたびに自動保存
watch(pinnedIds, (v) => save(PIN_KEY, v), { deep: true })
watch(todos, (v) => save(TODO_KEY, v), { deep: true })

// ===== ピン留め =====
const isPinned = (id: string) => pinnedIds.value.includes(id)

const togglePin = (id: string) => {
  pinnedIds.value = isPinned(id)
    ? pinnedIds.value.filter((x) => x !== id)
    : [...pinnedIds.value, id]
}

// ===== メモ・TODO =====
const todosOf = (appId: string): Todo[] => todos.value[appId] ?? []

const doneCount = (appId: string) => todosOf(appId).filter((t) => t.done).length

const addTodo = (appId: string) => {
  const text = (drafts.value[appId] ?? '').trim()
  if (!text) return
  todos.value = {
    ...todos.value,
    [appId]: [...todosOf(appId), { id: Date.now() + Math.random(), text, done: false }],
  }
  drafts.value[appId] = ''
}

const toggleTodo = (appId: string, todoId: number) => {
  const item = todosOf(appId).find((t) => t.id === todoId)
  if (item) item.done = !item.done
}

const removeTodo = (appId: string, todoId: number) => {
  todos.value = {
    ...todos.value,
    [appId]: todosOf(appId).filter((t) => t.id !== todoId),
  }
}

// ===== 検索・並び替え =====
// 名前・説明・技術タグを対象にする（大文字小文字を区別しない、空白区切りのAND検索）
const filteredApps = computed(() => {
  const words = query.value.toLowerCase().split(/\s+/).filter(Boolean)
  return apps.filter((app) => {
    const text = [app.name, app.description, ...app.tech].join(' ').toLowerCase()
    return words.every((w) => text.includes(w))
  })
})

// ピン留めを先頭に。sort は安定なので、元の並び順は保たれる
const visibleApps = computed(() =>
  [...filteredApps.value].sort((a, b) => Number(isPinned(b.id)) - Number(isPinned(a.id))),
)
</script>

<template>
  <main class="portal">
    <header class="portal-header">
      <h1 class="portal-title">My iPad Portal</h1>
      <p class="portal-subtitle">自作アプリへのショートカット</p>
    </header>

    <!-- クイック検索 -->
    <div class="search-box">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input
        v-model="query"
        class="search-input"
        type="search"
        placeholder="アプリ名・説明・技術で検索"
        aria-label="アプリを検索"
        autocomplete="off"
      />
    </div>

    <TransitionGroup v-if="visibleApps.length" tag="section" name="card" class="app-grid">
      <article
        v-for="app in visibleApps"
        :key="app.id"
        class="app-item"
        :class="{ 'is-pinned': isPinned(app.id) }"
        :style="{ '--c1': app.color[0], '--c2': app.color[1] }"
      >
        <!-- カードのリンク部分をタップすると別タブで開く -->
        <a class="app-card" :href="app.url" target="_blank" rel="noopener noreferrer">
          <span class="app-icon">{{ app.icon }}</span>
          <h2 class="app-name">{{ app.name }}</h2>
          <p class="app-desc">{{ app.description }}</p>
          <ul class="app-tech">
            <li v-for="t in app.tech" :key="t">{{ t }}</li>
          </ul>
          <span class="app-open" aria-hidden="true">↗</span>
        </a>

        <!-- ピン留めボタン（リンクの外に置いて誤遷移を防ぐ） -->
        <button
          type="button"
          class="pin-btn"
          :class="{ active: isPinned(app.id) }"
          :aria-pressed="isPinned(app.id)"
          :aria-label="`${app.name}を${isPinned(app.id) ? 'ピン留め解除' : 'ピン留め'}`"
          @click="togglePin(app.id)"
        >
          📌
        </button>

        <!-- メモ・TODO -->
        <section class="app-notes" :aria-label="`${app.name}のメモ・TODO`">
          <div class="notes-head">
            <span>メモ / TODO</span>
            <span v-if="todosOf(app.id).length" class="notes-count">
              {{ doneCount(app.id) }} / {{ todosOf(app.id).length }}
            </span>
          </div>

          <ul v-if="todosOf(app.id).length" class="todo-list">
            <li
              v-for="t in todosOf(app.id)"
              :key="t.id"
              class="todo-item"
              :class="{ done: t.done }"
            >
              <button
                type="button"
                class="todo-check"
                :aria-pressed="t.done"
                :aria-label="`${t.text}を${t.done ? '未完了' : '完了'}にする`"
                @click="toggleTodo(app.id, t.id)"
              >
                <span class="todo-box">{{ t.done ? '✓' : '' }}</span>
              </button>
              <span class="todo-text">{{ t.text }}</span>
              <button
                type="button"
                class="todo-remove"
                :aria-label="`${t.text}を削除`"
                @click="removeTodo(app.id, t.id)"
              >
                ×
              </button>
            </li>
          </ul>

          <form class="todo-form" @submit.prevent="addTodo(app.id)">
            <input
              v-model="drafts[app.id]"
              class="todo-input"
              type="text"
              placeholder="メモやTODOを追加"
              :aria-label="`${app.name}にメモを追加`"
              autocomplete="off"
              enterkeyhint="done"
            />
            <button type="submit" class="todo-add" aria-label="追加">＋</button>
          </form>
        </section>
      </article>
    </TransitionGroup>
    <p v-else class="empty-message">「{{ query }}」に一致するアプリはありません</p>
  </main>
</template>
