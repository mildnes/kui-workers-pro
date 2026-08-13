<template>
  <div v-if="role === 'admin' && activeTab === 'users'" class="kui-users-page">
    <section class="kui-users-panel">
      <div class="kui-users-heading">
        <div><h2>用户账号</h2><p>管理登录状态、有效期和流量配额。</p></div>
        <span>{{ users.length }} 个用户</span>
      </div>
      <form class="kui-user-create" @submit.prevent="submitUser">
        <label><span>用户名 <b class="kui-required">*</b></span><input v-model.trim="newUser.username" required maxlength="64" pattern="[A-Za-z0-9_.-]+" autocomplete="off" placeholder="例如 user01"></label>
        <label><span>登录密码 <b class="kui-required">*</b></span><div class="kui-user-password"><input v-model="newUser.password" required minlength="12" type="text" autocomplete="new-password" placeholder="至少 12 位"><button type="button" @click="generateUUIDForNewUser" title="随机生成 UUID 密码" aria-label="随机生成 UUID 密码">↻</button></div></label>
        <label><span>配额 <em>GB，0 为无限</em></span><input v-model="newUser.traffic_limit_gb" type="number" min="0" step="0.01" placeholder="0"></label>
        <label><span>有效期 <em>留空为永久</em></span><input v-model="newUser.expire_date" type="date"></label>
        <button type="submit" class="kui-users-primary" :disabled="creatingUser"><span v-if="creatingUser" class="kui-spin">↻</span>{{ creatingUser ? '正在开通' : '开通用户' }}</button>
      </form>
    </section>

    <section class="kui-user-list">
      <div v-if="users.length === 0" class="kui-users-empty">暂无普通用户，可在上方创建。</div>
      <article v-for="u in users" :key="u.username" class="kui-user-card" :class="{ 'is-disabled': Number(u.enable) !== 1 }">
        <header>
          <div class="min-w-0"><div class="kui-user-name"><strong>{{ u.username }}</strong><span :class="Number(u.enable) === 1 ? 'is-active' : 'is-blocked'">{{ Number(u.enable) === 1 ? '正常' : '已停用' }}</span></div><p>有效期：{{ formatDate(u.expire_time) }}</p></div>
          <div class="kui-user-actions"><button type="button" @click="runUserAction(u.username, () => toggleUser(u.username, Number(u.enable) === 1 ? 0 : 1))" :disabled="userActionPending[u.username]">{{ Number(u.enable) === 1 ? '停用' : '启用' }}</button><button type="button" class="is-danger" @click="runUserAction(u.username, () => deleteUser(u.username))" :disabled="userActionPending[u.username]">删除</button></div>
        </header>
        <div class="kui-user-traffic"><div><span>已用 {{ formatBytes(u.traffic_used) }}</span><span>上限 {{ u.traffic_limit > 0 ? formatBytes(u.traffic_limit) : '无限' }}</span></div><div class="kui-user-progress"><i :class="{ 'is-over': u.traffic_limit > 0 && u.traffic_used >= u.traffic_limit }" :style="{ width: getTrafficPercent(u.traffic_used, u.traffic_limit) + '%' }"></i></div></div>
        <footer><span>{{ u.traffic_limit > 0 ? `使用率 ${getTrafficPercent(u.traffic_used, u.traffic_limit).toFixed(1)}%` : '未限制流量' }}</span><button v-if="u.traffic_used > 0" type="button" @click="runUserAction(u.username, () => resetUserTraffic(u.username))" :disabled="userActionPending[u.username]">重置流量</button></footer>
      </article>
    </section>

    <section class="kui-users-panel kui-groups-section">
      <div class="kui-users-heading"><div><h2>用户组与资源授权</h2><p>一个用户可加入多个组，授权整台 VPS 或单个节点。</p></div><span>{{ groups.length }} 个用户组</span></div>
      <div class="kui-groups-note">组授权会自动合并；未加入用户组的账号仍沿用节点归属规则。成员或资源可使用 Ctrl / Command 多选。</div>
      <form class="kui-group-create" @submit.prevent="submitGroup"><label><span>用户组名称 <b class="kui-required">*</b></span><input v-model.trim="newGroupName" required maxlength="64" placeholder="例如：流媒体组"></label><button type="submit" class="kui-users-primary" :disabled="creatingGroup"><span v-if="creatingGroup" class="kui-spin">↻</span>{{ creatingGroup ? '正在创建' : '创建用户组' }}</button></form>
      <div v-if="groups.length === 0" class="kui-users-empty">尚未创建用户组。</div>
      <article v-for="group in groups" :key="group.id" class="kui-group-card">
        <header><div><h3>{{ group.name }}</h3><p>成员 {{ groupDraft(group).members.length }} 人 · 授权 {{ groupDraft(group).resources.length }} 项</p></div><button type="button" class="is-danger" @click="runGroupAction(group.id, () => deleteGroup(group))" :disabled="groupActionPending[group.id]">删除用户组</button></header>
        <div class="kui-group-grid">
          <label><span>组成员</span><select multiple v-model="groupDraft(group).members"><option v-for="u in users" :key="u.username" :value="u.username">{{ u.username }}</option></select><small v-if="users.length === 0">请先创建用户</small></label>
          <label><span>可用资源</span><select multiple v-model="groupDraft(group).resources"><optgroup label="整台 VPS（包含该机所有节点）"><option v-for="vps in servers" :key="'vps:'+vps.ip" :value="'vps:'+vps.ip">VPS · {{ vps.name }} ({{ vps.ip }})</option></optgroup><optgroup label="单独节点"><option v-for="node in nodes" :key="'node:'+node.id" :value="'node:'+node.id">节点 · {{ getVpsName(node.vps_ip) }} · {{ node.protocol }}:{{ node.port }}</option></optgroup></select><small v-if="servers.length === 0 && nodes.length === 0">暂无可授权资源</small></label>
        </div>
        <footer><button type="button" class="kui-users-primary" @click="runGroupAction(group.id, () => saveGroup(group))" :disabled="groupActionPending[group.id]"><span v-if="groupActionPending[group.id]" class="kui-spin">↻</span>{{ groupActionPending[group.id] ? '正在保存' : '保存授权' }}</button></footer>
      </article>
    </section>
  </div>
</template>

<script>
import { inject, reactive, ref } from 'vue';
import { KUI_KEY } from '../app/context.js';

export default {
  setup() {
    const state = inject(KUI_KEY);
    const creatingUser = ref(false);
    const creatingGroup = ref(false);
    const userActionPending = reactive({});
    const groupActionPending = reactive({});
    const submitUser = async () => { if (creatingUser.value) return; creatingUser.value = true; try { await state.addUser(); } finally { creatingUser.value = false; } };
    const submitGroup = async () => { if (creatingGroup.value) return; creatingGroup.value = true; try { await state.addGroup(); } finally { creatingGroup.value = false; } };
    const runUserAction = async (username, action) => { if (userActionPending[username]) return; userActionPending[username] = true; try { await action(); } finally { delete userActionPending[username]; } };
    const runGroupAction = async (id, action) => { if (groupActionPending[id]) return; groupActionPending[id] = true; try { await action(); } finally { delete groupActionPending[id]; } };
    return { ...state, creatingGroup, creatingUser, groupActionPending, runGroupAction, runUserAction, submitGroup, submitUser, userActionPending };
  },
};
</script>
