<template>
  <div v-if="probeEditModalOpen" class="kui-modal-backdrop fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div class="kui-modal-surface bg-white rounded-3xl p-8 shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">
                  <button @click="probeEditModalOpen = false" class="absolute top-4 right-5 text-2xl text-slate-400 hover:text-slate-600">&times;</button>
                  <h3 class="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">✏️ 编辑探针展示信息</h3>
                  <div class="space-y-4">
                      <div class="flex gap-4">
                          <div class="flex-1"><label class="block text-xs font-bold text-slate-500 mb-1">展示别名</label><input v-model="editingProbeNode.name" class="w-full border p-2.5 rounded-xl text-sm font-medium text-slate-700"></div>
                          <div class="flex-1"><label class="block text-xs font-bold text-slate-500 mb-1">前台可见性</label><select v-model="editingProbeNode.is_hidden" class="w-full border p-2.5 rounded-xl text-sm font-medium text-slate-700"><option value="false">显示 (默认)</option><option value="true">隐藏</option></select></div>
                      </div>
                      <div><label class="block text-xs font-bold text-slate-500 mb-1">分组名称</label><input v-model="editingProbeNode.server_group" class="w-full border p-2.5 rounded-xl text-sm font-medium text-slate-700"></div>
                      <div class="flex gap-4">
                          <div class="flex-1"><label class="block text-xs font-bold text-slate-500 mb-1">价格</label><input v-model="editingProbeNode.price" placeholder="如: 10USD/年" class="w-full border p-2.5 rounded-xl text-sm font-medium text-slate-700"></div>
                          <div class="flex-1"><label class="block text-xs font-bold text-slate-500 mb-1">到期时间</label><input type="date" v-model="editingProbeNode.expire_date" class="w-full border p-2.5 rounded-xl text-sm font-medium text-slate-700"></div>
                      </div>
                      <div class="flex gap-4">
                          <div class="flex-1"><label class="block text-xs font-bold text-slate-500 mb-1">带宽 (徽章)</label><input v-model="editingProbeNode.bandwidth" placeholder="如: 1Gbps" class="w-full border p-2.5 rounded-xl text-sm font-medium text-slate-700"></div>
                          <div class="flex-1"><label class="block text-xs font-bold text-slate-500 mb-1">流量总量 (徽章)</label><input v-model="editingProbeNode.traffic_limit" placeholder="如: 1TB/月" class="w-full border p-2.5 rounded-xl text-sm font-medium text-slate-700"></div>
                      </div>
                      <div class="bg-amber-50 p-4 border border-amber-100 rounded-xl mt-2">
                          <label class="block text-xs font-bold text-amber-700 mb-1">每月流量重置日 (1-31)</label>
                          <p class="text-[10px] text-amber-600 mb-2">需在【系统设置】开启“启用流量按期重置”。到达此日时该机器记录流量自动清零。</p>
                          <input type="number" min="1" max="31" v-model="editingProbeNode.reset_day" class="w-full border border-amber-200 p-2.5 rounded-xl text-sm font-medium text-amber-900 bg-white">
                      </div>
                  </div>
                  <div class="mt-8 flex justify-end gap-3">
                      <button @click="probeEditModalOpen = false" class="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition">取消</button>
                      <button @click="saveProbeEdit" class="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition">保存更改</button>
                  </div>
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
