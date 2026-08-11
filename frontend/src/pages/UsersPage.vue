<template>
  <div class="space-y-6">
    <div v-if="role === 'admin' && activeTab === 'users'" class="space-y-6">
                    <div class="bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 flex flex-col xl:flex-row gap-4 items-end">
                        <div class="flex-1 w-full"><label class="block text-xs font-bold text-slate-400 mb-2 pl-2">新建用户名</label><input v-model="newUser.username" placeholder="如: user01" class="w-full bg-white/50 border border-white p-3 rounded-2xl transition hover:bg-white focus:bg-white"></div>
                        <div class="flex-1 w-full relative"><label class="block text-xs font-bold text-slate-400 mb-2 pl-2">登录密码 / 随机UUID</label><input v-model="newUser.password" type="text" placeholder="自定义密码 或 UUID" class="w-full bg-white/50 border border-white p-3 pr-12 rounded-2xl transition hover:bg-white focus:bg-white font-mono text-sm"><button @click="generateUUIDForNewUser" title="随机生成 UUID 密码" class="absolute right-3 top-[34px] p-1 bg-white rounded-lg shadow-sm hover:bg-indigo-50 transition-colors">🔄</button></div>
                        <div class="flex-1 w-full"><label class="block text-xs font-bold text-slate-400 mb-2 pl-2">配额 (GB)</label><input v-model="newUser.traffic_limit_gb" type="number" placeholder="0为无限" class="w-full bg-white/50 border border-white p-3 rounded-2xl transition hover:bg-white focus:bg-white"></div>
                        <div class="flex-1 w-full"><label class="block text-xs font-bold text-slate-400 mb-2 pl-2">有效期</label><input v-model="newUser.expire_date" type="date" class="w-full bg-white/50 border border-white p-3 rounded-2xl text-slate-600 transition hover:bg-white focus:bg-white"></div>
                        <button @click="addUser" class="w-full xl:w-auto bg-slate-800 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-black transition-all shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap">开通用户</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div v-for="u in users" :key="u.username" class="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 hover:shadow-indigo-100/50 transition-all">
                            <div class="flex justify-between items-start mb-6"><div><h3 class="text-2xl font-black text-slate-800 mb-1 flex items-center gap-2">{{ u.username }} <span v-if="u.enable===0" class="text-[10px] bg-rose-100 text-rose-600 px-2 py-1 rounded-lg">已封禁</span></h3><div class="text-xs text-slate-400 font-medium">到期: {{ formatDate(u.expire_time) }}</div></div><div class="flex gap-2"><button @click="toggleUser(u.username, u.enable===1?0:1)" class="px-3 py-1.5 bg-white border border-slate-100 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-sm">{{ u.enable===1?'停用':'启用' }}</button><button @click="deleteUser(u.username)" class="px-3 py-1.5 bg-rose-50 text-rose-500 rounded-xl text-xs font-bold transition-all">删除</button></div></div>
                            <div class="flex justify-between text-xs text-slate-500 mb-2 font-bold"><span>已用: {{ formatBytes(u.traffic_used) }}</span><span>上限: {{ u.traffic_limit > 0 ? formatBytes(u.traffic_limit) : '无限' }}</span></div>
                            <div class="w-full bg-slate-100 rounded-full h-2.5 mb-3 overflow-hidden shadow-inner"><div :class="(u.traffic_limit > 0 && u.traffic_used >= u.traffic_limit) ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'" class="h-2.5 rounded-full" :style="{ width: getTrafficPercent(u.traffic_used, u.traffic_limit) + '%' }"></div></div>
                            <button v-if="u.traffic_used > 0" @click="resetUserTraffic(u.username)" class="text-[11px] text-indigo-500 font-bold hover:underline">重置流量</button>
                        </div>
                    </div>
                </div>
    <div v-if="role === 'admin' && activeTab === 'users'" class="space-y-6 pt-4 border-t border-slate-200/70">
                    <div class="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl text-sm text-indigo-800 font-medium">用户组可把整台 VPS 或单个节点授权给多个用户。用户订阅会自动合并其所属全部组的授权资源；未加入任何组的旧用户仍按原有“节点归属”规则工作。</div>
                    <div class="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-xl flex flex-col md:flex-row gap-4 items-end">
                        <div class="flex-1 w-full"><label class="block text-xs font-bold text-slate-400 mb-2 pl-2">新用户组名称</label><input v-model="newGroupName" maxlength="64" placeholder="例如：流媒体组 / 商务组" class="w-full bg-white border border-slate-100 p-3 rounded-2xl outline-none"></div>
                        <button @click="addGroup" class="w-full md:w-auto bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold hover:bg-black">创建用户组</button>
                    </div>
                    <div v-if="groups.length === 0" class="text-center py-12 text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-3xl">尚未创建用户组</div>
                    <div v-for="group in groups" :key="group.id" class="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-xl space-y-5">
                        <div class="flex justify-between gap-4 items-center"><div><h3 class="text-xl font-black text-slate-800">{{ group.name }}</h3><p class="text-xs text-slate-400 mt-1">成员 {{ groupDraft(group).members.length }} 人 · 已授权 {{ groupDraft(group).resources.length }} 项资源</p></div><button @click="deleteGroup(group)" class="text-rose-500 bg-rose-50 px-3 py-2 rounded-xl text-xs font-bold">删除用户组</button></div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div><label class="block text-xs font-bold text-slate-500 mb-2">组成员</label><select multiple v-model="groupDraft(group).members" class="w-full h-36 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none"><option v-for="u in users" :key="u.username" :value="u.username">{{ u.username }}</option></select><p class="text-[10px] text-slate-400 mt-1">按 Ctrl / Command 多选</p></div>
                            <div><label class="block text-xs font-bold text-slate-500 mb-2">可用资源</label><select multiple v-model="groupDraft(group).resources" class="w-full h-36 bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none"><optgroup label="整台 VPS（包含该机所有节点）"><option v-for="vps in servers" :key="'vps:'+vps.ip" :value="'vps:'+vps.ip">VPS · {{ vps.name }} ({{ vps.ip }})</option></optgroup><optgroup label="单独节点"><option v-for="node in nodes" :key="'node:'+node.id" :value="'node:'+node.id">节点 · {{ getVpsName(node.vps_ip) }} · {{ node.protocol }}:{{ node.port }}</option></optgroup></select><p class="text-[10px] text-slate-400 mt-1">整机授权与单节点授权可叠加</p></div>
                        </div>
                        <div class="flex justify-end"><button @click="saveGroup(group)" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700">保存授权</button></div>
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
