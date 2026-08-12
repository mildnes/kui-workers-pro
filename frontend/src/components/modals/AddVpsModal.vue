<template>
  <div
    v-if="isLoggedIn && role === 'admin' && addVpsModalOpen"
    class="kui-add-vps-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="kui-add-vps-title"
    @click.self="close"
    @keydown.esc="close"
  >
    <form class="kui-add-vps-dialog" @submit.prevent="submit">
      <div class="kui-add-vps-header">
        <div>
          <h2 id="kui-add-vps-title">接入 VPS</h2>
          <p>添加服务器别名、公网 IP 与系统架构</p>
        </div>
        <button type="button" class="kui-icon-button" aria-label="关闭接入 VPS 窗口" @click="close">×</button>
      </div>

      <div class="kui-add-vps-form">
        <label>
          <span>服务器别名</span>
          <input ref="nameInput" v-model.trim="newVps.name" required placeholder="例如：日本软银 01">
        </label>
        <label>
          <span>公网 IP</span>
          <input v-model.trim="newVps.ip" required inputmode="decimal" placeholder="8.8.8.8">
        </label>
        <label class="kui-add-vps-os">
          <span>系统架构</span>
          <select v-model="newVps.os">
            <option value="debian">Ubuntu / Debian</option>
            <option value="alpine">Alpine Linux</option>
          </select>
        </label>
      </div>

      <div class="kui-add-vps-actions">
        <button type="button" class="kui-button kui-button-ghost" @click="close">取消</button>
        <button type="submit" class="kui-button kui-button-primary" :disabled="addingVps">
          <span v-if="addingVps" class="kui-spin">↻</span>{{ addingVps ? '正在接入' : '确认接入' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { inject, nextTick, ref, watch } from 'vue';
import { KUI_KEY } from '../../app/context.js';

export default {
  setup() {
    const state = inject(KUI_KEY);
    const nameInput = ref(null);
    const close = () => { if (!state.addingVps.value) state.addVpsModalOpen.value = false; };
    const submit = async () => {
      try {
        if (await state.addVps()) state.addVpsModalOpen.value = false;
      } catch (_) {}
    };
    watch(state.addVpsModalOpen, async open => {
      if (open) { await nextTick(); nameInput.value?.focus(); }
    });
    return { ...state, close, nameInput, submit };
  },
};
</script>
