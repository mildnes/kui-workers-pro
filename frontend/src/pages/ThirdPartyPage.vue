<template>
  <div v-if="role === 'admin' && activeTab === 'thirdparty'" class="space-y-6">
                  <div class="bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white shadow-xl shadow-slate-200/40">
                      <h3 class="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">🔗 添加第三方机场订阅</h3>
                      <p class="text-xs text-slate-500 mb-4 font-medium">粘贴机场订阅链接（支持 Base64 / 直链），添加后系统将自动解析节点并存入数据库。删除订阅时会自动删除关联节点。后续更新请重新添加。</p>
                      <div class="flex flex-col md:flex-row gap-4 items-end">
                          <div class="flex-1 w-full"><label class="block text-xs font-bold text-slate-400 mb-2 pl-2">订阅别名</label><input v-model="newThirdParty.name" placeholder="例如: 美国机场" class="w-full bg-white/50 border border-white p-3 rounded-2xl transition hover:bg-white focus:bg-white text-sm"></div>
                          <div class="flex-1 w-full"><label class="block text-xs font-bold text-slate-400 mb-2 pl-2">订阅链接 URL</label><input v-model="newThirdParty.url" placeholder="https://xxx.com/api/v1/client/subscribe?token=xxx" class="w-full bg-white/50 border border-white p-3 rounded-2xl transition hover:bg-white focus:bg-white text-sm font-mono"></div>
                          <button @click="addThirdPartySubscription" :disabled="loadingThirdParty" class="h-[50px] bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 rounded-2xl font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap disabled:opacity-50">{{ loadingThirdParty ? '解析中...' : '➕ 添加并解析' }}</button>
                      </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      <div v-for="sub in thirdPartySubscriptions" :key="sub.id" class="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 hover:shadow-orange-100/50 transition-all">
                          <div class="flex justify-between items-start mb-4">
                              <div>
                                  <h3 class="font-black text-lg text-slate-800 flex items-center gap-2">{{ sub.name }} <span :class="sub.is_enable ? 'bg-emerald-500' : 'bg-rose-500'" class="w-2.5 h-2.5 rounded-full inline-block shadow-sm"></span></h3>
                                  <p class="text-[11px] text-slate-400 font-mono mt-1 break-all truncate">{{ sub.url }}</p>
                              </div>
                              <div class="flex gap-2">
                                  <button @click="toggleThirdPartySubscription(sub.id, sub.is_enable ? 0 : 1)" class="px-3 py-1.5 bg-white border border-slate-100 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm">{{ sub.is_enable ? '停用' : '启用' }}</button>
                                  <button @click="deleteThirdPartySubscription(sub.id)" class="px-3 py-1.5 bg-rose-50 text-rose-500 rounded-xl text-xs font-bold transition-all">删除</button>
                              </div>
                          </div>
                          <div class="flex justify-between items-center text-[11px] text-slate-500 font-bold">
                              <span>解析节点: <span class="text-orange-600">{{ sub.node_count }}</span> 个</span>
                              <span>添加: {{ new Date(sub.added_at).toLocaleDateString() }}</span>
                          </div>
                      </div>
                  </div>
                  <div v-if="thirdPartySubscriptions.length === 0" class="bg-white/60 backdrop-blur-xl p-12 rounded-[2rem] border border-dashed border-slate-300 text-center">
                      <p class="text-slate-400 font-medium text-sm">暂无第三方订阅，请在上方添加。</p>
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
