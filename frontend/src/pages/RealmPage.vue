<template>
  <div v-if="isLoggedIn && role === 'admin' && activeTab === 'realm'" class="min-h-[420px] flex items-center justify-center px-4">
                  <div class="w-full max-w-xl bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white shadow-xl shadow-cyan-100/40 p-10 text-center">
                      <div class="w-16 h-16 mx-auto mb-5 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-3xl">🔀</div>
                      <h3 class="text-2xl font-black text-slate-800">Realm 中转</h3>
                      <p class="mt-3 text-slate-500 font-medium">未来规划，敬请期待</p>
                  </div>
              </div>
</template>

<script>
import { inject } from 'vue';
import { KUI_KEY } from '../app/context.js';

export default {
  setup() {
    return inject(KUI_KEY);
  },
};
</script>
