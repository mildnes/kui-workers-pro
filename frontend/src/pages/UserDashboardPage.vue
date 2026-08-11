<template>
  <div v-if="role === 'user' && activeTab === 'dashboard'" class="space-y-8">
                  <div class="bg-white/60 backdrop-blur-xl p-10 md:p-16 rounded-[3rem] shadow-2xl border border-white text-center relative overflow-hidden">
                      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-32 bg-indigo-400/20 blur-3xl rounded-full pointer-events-none"></div>
                      <h2 class="text-4xl md:text-5xl font-black mb-3 text-slate-800 relative z-10">Hi, {{ currentUser }} 👋</h2>
                      <p class="text-slate-500 mb-10 font-medium relative z-10">欢迎来到您的专属网络服务中心</p>
                      <div class="max-w-md mx-auto bg-white/80 p-8 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 mb-10 relative z-10">
                          <div class="flex justify-between text-sm font-black text-slate-700 mb-3"><span>已用流量: {{ formatBytes(users[0]?.traffic_used || 0) }}</span><span class="text-indigo-600">总量: {{ users[0]?.traffic_limit > 0 ? formatBytes(users[0].traffic_limit) : '无限制' }}</span></div>
                          <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner mb-4"><div :class="users[0]?.traffic_used >= users[0]?.traffic_limit && users[0]?.traffic_limit > 0 ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'" class="h-3 transition-all duration-1000 rounded-full" :style="{ width: getTrafficPercent(users[0]?.traffic_used||0, users[0]?.traffic_limit||0) + '%' }"></div></div>
                          <div class="flex justify-between mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium"><span>账户状态: <span :class="users[0]?.enable === 1 ? 'text-emerald-500 font-bold bg-emerald-50 px-2 py-1 rounded' : 'text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded'">{{ users[0]?.enable === 1 ? '🟢 正常运行' : '🔴 已被封禁' }}</span></span><span>到期时间: <span class="font-bold text-slate-700">{{ formatDate(users[0]?.expire_time) }}</span></span></div>
                      </div>
                      <div class="flex flex-col md:flex-row justify-center gap-4 relative z-10">
                          <button @click="copyCommand(generateSubLink('', ''), '普通订阅链接已复制！')" class="bg-gradient-to-r from-slate-800 to-black text-white font-black py-4 px-8 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 text-lg">🔗 复制普通订阅</button>
                          <button @click="copyCommand(generateSubLink('', 'clash'), 'Clash订阅链接已复制！')" class="bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-4 px-8 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 text-lg">🔗 复制Clash订阅</button>
                          <button @click="copySurgeConfig('')" class="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black py-4 px-8 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 text-lg">📋 复制 Surge 配置段</button>
                          <button @click="showQrCode(generateSubLink('', ''))" class="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black py-4 px-8 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 text-lg">📱 显示二维码</button>
                      </div>
                  </div>
                  <div>
                      <h3 class="font-black text-xl mb-6 text-slate-700 px-4">📍 我已开通的节点</h3>
                      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div v-for="node in nodes" :key="node.id" class="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-lg transition-all hover:-translate-y-1">
                              <div class="font-black text-xl mb-4 text-slate-800">{{ getVpsName(node.vps_ip) }}</div>
                              <div class="flex justify-between items-center"><span class="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs">{{ node.protocol }}</span><span class="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">PORT: {{ node.port }}</span></div>
                          </div>
                      </div>
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
