<template>
  <ProbePage />
  <AppShell />
  <ProbeEditModal />
  <QrModal />
</template>

<script>
import { provide } from 'vue';
import AppShell from './app/AppShell.vue';
import { KUI_KEY } from './app/context.js';
import ProbeEditModal from './components/modals/ProbeEditModal.vue';
import QrModal from './components/modals/QrModal.vue';
import { useKuiState } from './composables/useKuiState.js';
import ProbePage from './pages/ProbePage.vue';

export default {
  components: { AppShell, ProbeEditModal, ProbePage, QrModal },
  setup() {
    const state = useKuiState();
    provide(KUI_KEY, state);
    return state;
  },
};
</script>
