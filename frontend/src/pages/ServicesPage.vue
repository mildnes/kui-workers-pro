<template>
  <div v-if="isLoggedIn && role === 'admin' && activeTab === 'services'" class="max-w-5xl mx-auto px-4 py-8 space-y-6">
                  <div class="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white shadow-xl shadow-violet-100/40 p-7 md:p-9">
                      <div class="flex items-center gap-4">
                          <div class="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-2xl">🧩</div>
                          <div><h2 class="text-2xl font-black text-slate-800">第三方服务</h2><p class="mt-1 text-sm font-medium text-slate-500">以下服务由第三方提供，点击将在新标签页打开。</p></div>
                      </div>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <a href="https://webssh.bytevirt.net/?encoding=utf-8&" target="_blank" rel="noopener noreferrer" class="group bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white p-7 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100/60">
                          <div class="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-xl mb-5">⌨</div>
                          <h3 class="text-lg font-black text-slate-800">WebSSH 服务</h3>
                          <p class="mt-2 text-sm leading-relaxed text-slate-500">在浏览器中打开第三方 SSH 终端服务。</p>
                          <span class="mt-6 inline-flex items-center gap-2 text-sm font-black text-cyan-600">打开服务 <span class="transition-transform group-hover:translate-x-1">→</span></span>
                      </a>
                      <a href="https://derouter.ai?ref=0oZZ1HVc" target="_blank" rel="noopener noreferrer" class="group bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white p-7 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-100/60">
                          <div class="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-xl mb-5">AI</div>
                          <h3 class="text-lg font-black text-slate-800">AI 中转服务</h3>
                          <p class="mt-2 text-sm leading-relaxed text-slate-500">访问 Derouter AI 中转服务。</p>
                          <span class="mt-6 inline-flex items-center gap-2 text-sm font-black text-violet-600">打开服务 <span class="transition-transform group-hover:translate-x-1">→</span></span>
                      </a>
                      <a href="https://bytevirt.com/aff.php?aff=209" target="_blank" rel="noopener noreferrer" class="group bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white p-7 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-100/60">
                          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-5">VPS</div>
                          <h3 class="text-lg font-black text-slate-800">ByteVirt VPS</h3>
                          <p class="mt-2 text-sm leading-relaxed text-slate-500">访问 ByteVirt VPS 服务页面。</p>
                          <span class="mt-6 inline-flex items-center gap-2 text-sm font-black text-emerald-600">打开服务 <span class="transition-transform group-hover:translate-x-1">→</span></span>
                      </a>
                  </div>
                  <p class="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs font-medium leading-relaxed text-amber-700">第三方服务与 KUI 无账号、凭据或数据传递关系。使用 WebSSH 时请自行确认服务可信度，并手动填写服务器连接信息。</p>
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
