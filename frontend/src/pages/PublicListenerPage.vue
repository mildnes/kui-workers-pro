<template>
  <div v-if="role === 'admin' && activeTab === 'public-listener'" class="kui-public-listener-page space-y-4">
    <section class="kui-public-listener-hero rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl md:p-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-black text-slate-800">住宅代理公网监听</h2>
          <p class="mt-1 text-xs leading-relaxed text-slate-500">按 VPS 控制住宅 SOCKS5/HTTP 代理是否允许通过公网 IP 访问。关闭时仍可供本机及 Docker 网络使用。</p>
        </div>
        <span class="kui-public-listener-risk inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700">
          <span class="h-2 w-2 rounded-full bg-amber-500"></span>高风险入口
        </span>
      </div>
      <div class="kui-public-listener-warning mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-[11px] font-bold leading-relaxed text-amber-700">
        开启后将监听 <span class="font-mono">0.0.0.0</span> 与 <span class="font-mono">[::]</span>。请使用强代理凭据，并在防火墙或云安全组中限制来源 IP。
      </div>
      <div v-if="!proxyPublicListenerManageable" class="kui-public-listener-error mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700">当前使用外部住宅控制器，本面板不能修改 VPS 监听范围。</div>
      <div v-else-if="!proxyCredentialsReady" class="kui-public-listener-error mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-bold text-rose-700">尚未配置 PROXY_USER / PROXY_PASS Secret，公网监听开关已禁用。</div>
    </section>

    <section class="kui-public-listener-list overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-xl">
      <div v-if="servers.length === 0" class="px-4 py-12 text-center text-sm font-bold text-slate-400">暂无已接入的 VPS</div>
      <div v-for="vps in servers" :key="vps.ip" class="kui-public-listener-row flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0 md:px-5">
        <div class="min-w-0">
          <div class="truncate text-sm font-black text-slate-800">{{ vps.name || '未命名服务器' }}</div>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span class="font-mono">{{ vps.ip }}:{{ vps.proxy_public_port || 7920 }}</span>
            <span class="kui-public-listener-status rounded-full px-2 py-0.5 font-black" :class="vps.proxy_public_listener ? 'is-open bg-rose-50 text-rose-600' : 'is-local bg-emerald-50 text-emerald-600'">{{ vps.proxy_public_listener ? '公网已开放' : '仅本机/网桥' }}</span>
          </div>
        </div>
        <button type="button" role="switch" :aria-checked="vps.proxy_public_listener === true" :aria-label="`${vps.name || vps.ip} 公网监听`" @click="setProxyPublicListener(vps, !vps.proxy_public_listener)" :disabled="publicListenerSaving[vps.ip] || !proxyPublicListenerManageable || (!proxyCredentialsReady && !vps.proxy_public_listener)" class="kui-public-listener-switch kui-control-size-exempt relative h-7 w-12 flex-none rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40" :class="vps.proxy_public_listener ? 'is-open border-rose-500 bg-rose-500' : 'border-slate-300 bg-slate-200'">
          <span class="absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform" :class="vps.proxy_public_listener ? 'translate-x-5' : 'translate-x-0.5'"></span>
        </button>
      </div>
    </section>
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
