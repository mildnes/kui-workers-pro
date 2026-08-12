<template>
  <nav class="kui-mobile-nav" aria-label="移动端导航">
    <template v-if="role === 'admin'">
      <button v-for="item in primaryAdminItems" :key="item.id" @click="go(item.id)" :class="{ active: activeTab === item.id }"><span>{{ item.icon }}</span>{{ item.label }}</button>
      <button @click="moreOpen = true" :class="{ active: moreIds.includes(activeTab) }"><span>•••</span>更多</button>
    </template>
    <template v-else>
      <button v-for="item in userItems" :key="item.id" @click="go(item.id)" :class="{ active: activeTab === item.id }"><span>{{ item.icon }}</span>{{ item.label }}</button>
      <button @click="logout"><span>↪</span>退出</button>
    </template>
  </nav>

  <div v-if="moreOpen" class="kui-mobile-sheet-backdrop" @click.self="moreOpen = false">
    <section class="kui-mobile-sheet">
      <div class="kui-sheet-handle"></div>
      <div class="flex items-center justify-between mb-3"><strong>更多功能</strong><button class="kui-icon-button" @click="moreOpen = false">×</button></div>
      <div class="kui-mobile-more-grid">
        <button v-for="item in moreItems" :key="item.id" @click="go(item.id)" :class="{ active: activeTab === item.id }"><span>{{ item.icon }}</span>{{ item.label }}</button>
      </div>
      <button class="kui-mobile-logout" @click="logout">退出登录</button>
    </section>
  </div>
</template>

<script>
import { inject, ref } from 'vue';
import { KUI_KEY } from './context.js';

const primaryAdminItems = [
  { id: 'nodes', icon: '▣', label: '服务器' },
  { id: 'proxy', icon: '⌁', label: '住宅' },
  { id: 'users', icon: '◎', label: '用户' },
];
const moreItems = [
  { id: 'thirdparty', icon: '↗', label: '订阅' }, { id: 'add-vps', icon: '＋', label: '接入 VPS' }, { id: 'public-listener', icon: '◉', label: '公网监听' }, { id: 'settings', icon: '⚙', label: '设置' },
];
const userItems = [
  { id: 'dashboard', icon: '⌂', label: '主页' }, { id: 'settings', icon: '⚙', label: '设置' }, { id: 'probe', icon: '◉', label: '探针监控' },
];
const moreIds = moreItems.map(item => item.id);

export default {
  setup() {
    const state = inject(KUI_KEY);
    const moreOpen = ref(false);
    const go = id => {
      moreOpen.value = false;
      if (id === 'add-vps') { state.addVpsModalOpen.value = true; return; }
      state.activeTab.value = id;
      if (id === 'probe') state.probeDetailId.value = null;
    };
    return { ...state, go, moreIds, moreItems, moreOpen, primaryAdminItems, userItems };
  },
};
</script>
