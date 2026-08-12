<template>
  <div v-if="qrModalOpen" class="kui-modal-backdrop fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" @click.self="qrModalOpen = false">
              <div class="kui-modal-surface bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm relative text-center">
                  <button @click="qrModalOpen = false" class="absolute top-4 right-5 text-2xl text-slate-400 hover:text-slate-600">&times;</button>
                  <h3 class="text-xl font-black text-slate-800 mb-2">订阅二维码</h3>
                  <p class="text-xs text-slate-500 mb-6">请使用客户端扫描 (暂仅支持普通订阅解析)</p>
                  <div class="flex justify-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <img :src="qrCodeImage" alt="QR Code" class="w-48 h-48 object-contain rounded-xl">
                  </div>
                  <button @click="qrModalOpen = false" class="mt-6 w-full bg-slate-800 text-white px-4 py-3 rounded-xl font-bold hover:bg-black transition-all">关 闭</button>
              </div>
          </div>
</template>

<script>
import { inject } from 'vue';
import { KUI_KEY } from '../../app/context.js';

export default {
  setup() {
    return inject(KUI_KEY);
  },
};
</script>
