<template>
  <div v-if="activeTab === 'settings'" class="kui-settings-page space-y-6">
                  <template v-if="role === 'admin'">
                      <div class="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40">
                          <h3 class="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">⚙️ KUI 代理系统参数</h3>
                          <div class="max-w-md mb-6">
                              <label class="block text-xs font-bold text-slate-400 mb-2 pl-2">控制面板全局名称</label>
                              <div class="flex gap-3"><input v-model="siteTitleInput" placeholder="Cluster Gateway" class="w-full bg-white/50 border border-white p-3 rounded-2xl transition hover:bg-white focus:bg-white text-sm font-medium"><button @click="saveSiteTitle" class="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-md whitespace-nowrap">保存更改</button></div>
                          </div>
                          <div class="flex flex-col gap-3">
                              <label class="block text-xs font-bold text-slate-400 mb-2 pl-2">管理员订阅防泄漏重置</label>
                              <div class="flex flex-wrap items-center gap-3">
                                  <button @click="resetMySubLink" class="bg-rose-50 text-rose-600 border border-rose-100 px-6 py-3 rounded-2xl font-bold hover:bg-rose-100 transition-all shadow-sm">⚠️ 一键重置我的订阅令牌</button>
                                  <label class="flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold cursor-pointer transition-colors" :class="probeSys.subscription_protection === 'true' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-rose-200 bg-rose-50 text-rose-600'">
                                      <input type="checkbox" v-model="probeSys.subscription_protection" @change="saveSubscriptionProtection" true-value="true" false-value="false" class="w-4 h-4">
                                      订阅保护{{ probeSys.subscription_protection === 'true' ? '已开启' : '已关闭' }}
                                  </label>
                                  <span class="text-[10px] font-medium text-rose-600">（开启后订阅请求返回普通首页内容并停止在线更新；切换开关立即生效）</span>
                              </div>
                          </div>
                      </div>

                      <div class="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40">
                          <h3 class="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">⚡ Realtime 状态频率策略</h3>
                          <p class="text-xs text-slate-500 mb-5 font-medium">全局影响所有 VPS 的 Core 与 Proxy Agent。节点配置、出口切换、应用结果、上线和掉线仍会立即推送。</p>
                          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div><label class="block text-xs font-bold text-slate-500 mb-1">管理员后台查看 (秒)</label><input type="number" v-model.number="probeSys.realtime_admin_interval" min="5" max="60" step="1" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-medium text-slate-700"><p class="mt-1 text-[10px] text-slate-400">范围 5-60 秒，默认 5 秒</p></div>
                              <div><label class="block text-xs font-bold text-slate-500 mb-1">公开探针查看 (秒)</label><input type="number" v-model.number="probeSys.realtime_public_interval" min="10" max="120" step="1" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-medium text-slate-700"><p class="mt-1 text-[10px] text-slate-400">范围 10-120 秒，默认 10 秒</p></div>
                              <div><label class="block text-xs font-bold text-slate-500 mb-1">无人查看空闲 (秒)</label><input type="number" v-model.number="probeSys.realtime_idle_interval" min="30" max="600" step="1" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-medium text-slate-700"><p class="mt-1 text-[10px] text-slate-400">范围 30-600 秒，默认 30 秒</p></div>
                          </div>
                          <p class="mt-4 text-[10px] font-medium text-amber-600">要求：公开探针频率不得快于管理员后台；空闲频率不得快于公开探针。修改后点击下方“立即生效配置”。</p>
                      </div>

                      <div class="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40">
                          <h3 class="text-xl font-black text-slate-800 mb-6 flex items-center justify-between">
                              <div class="flex items-center gap-2">📊 探针大盘外观与设置</div>
                              <button @click="pullGithubNodes" class="text-xs bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-200 transition-colors shadow-sm">🔄 云端拉取最新主题/测速库</button>
                          </h3>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div class="space-y-4">
                                  <div><label class="block text-xs font-bold text-slate-500 mb-1">大盘展示标题</label><input v-model="probeSys.site_title" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-medium text-slate-700"></div>
                                  <div>
                                      <label class="block text-xs font-bold text-slate-500 mb-1">前端主题风格</label>
                                      <select v-model="probeSys.theme" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-medium text-slate-700">
                                          <option v-for="t in availableThemes" :key="t.id" :value="t.id">{{ t.name }}</option>
                                      </select>
                                  </div>
                                  <div v-if="probeSys.theme === 'theme6' || hasCustomCssFlag"><label class="block text-xs font-bold text-slate-500 mb-1">自定义 CSS 代码</label><textarea v-model="probeSys.custom_css" rows="3" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-mono"></textarea></div>
                                  <div><label class="block text-xs font-bold text-slate-500 mb-1">自定义背景图片 URL (清空恢复纯色)</label><input v-model="probeSys.custom_bg" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-medium text-slate-700"></div>
                                  <div><label class="block text-xs font-bold text-slate-500 mb-1">自定义 &lt;head&gt; 注入</label><textarea v-model="probeSys.custom_head" rows="2" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-mono"></textarea></div>
                                  <div><label class="block text-xs font-bold text-slate-500 mb-1">自定义底部 Script 注入</label><textarea v-model="probeSys.custom_script" rows="2" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-mono"></textarea></div>
                                  <div><label class="block text-xs font-bold text-slate-500 mb-1">探针客户端上报间隔 (秒)</label><input type="number" v-model="probeSys.report_interval" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-medium text-slate-700"></div>
                              </div>
                              <div class="space-y-4">
                                  <label class="block text-sm font-bold text-slate-700 mb-2">👁️ 前台展示控制</label>
                                  <label class="flex items-center gap-2 text-sm bg-yellow-50 p-2 border border-yellow-200 rounded-lg cursor-pointer"><input type="checkbox" v-model="probeSys.auto_reset_traffic" true-value="true" false-value="false" class="w-4 h-4"> <span class="flex-1">启用流量按期重置 (全局总控开关)<br><span class="text-[10px] text-slate-500">开启后各节点根据独立【重置日】自动清零流量。关闭则显示累计总流量。</span></span></label>
                                  <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" v-model="probeSys.is_public" true-value="true" false-value="false" class="w-4 h-4"> 开启公开访问 (取消勾选必须登录)</label>
                                  <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" v-model="probeSys.show_price" true-value="true" false-value="false" class="w-4 h-4"> 显示机器价格</label>
                                  <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" v-model="probeSys.show_expire" true-value="true" false-value="false" class="w-4 h-4"> 显示机器到期时间</label>
                                  <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" v-model="probeSys.show_bw" true-value="true" false-value="false" class="w-4 h-4"> 显示带宽徽章</label>
                                  <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" v-model="probeSys.show_tf" true-value="true" false-value="false" class="w-4 h-4"> 显示流量配额徽章</label>
                                  <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" v-model="probeSys.enable_popup" true-value="true" false-value="false" class="w-4 h-4"> 开启首页访问公告弹窗 (支持HTML)</label>
                                  <div v-if="probeSys.enable_popup === 'true'"><textarea v-model="probeSys.popup_content" rows="4" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm" placeholder="<h3>公告</h3><p>内容...</p>"></textarea></div>

                                  <label class="block text-sm font-bold text-blue-600 mt-6 mb-2">📡 动态下发三网测速节点配置</label>
                                  <div><label class="block text-xs font-bold text-slate-500 mb-1">电信 (CT)</label>
                                      <select v-model="probeSys.ping_node_ct" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm">
                                          <option value="default">默认节点 (双栈多节点轮询)</option>
                                          <option v-for="n in pingNodes.ct" :key="n.host" :value="n.host">{{ n.name }}</option>
                                      </select>
                                  </div>
                                  <div><label class="block text-xs font-bold text-slate-500 mb-1">联通 (CU)</label>
                                      <select v-model="probeSys.ping_node_cu" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm">
                                          <option value="default">默认节点 (双栈多节点轮询)</option>
                                          <option v-for="n in pingNodes.cu" :key="n.host" :value="n.host">{{ n.name }}</option>
                                      </select>
                                  </div>
                                  <div><label class="block text-xs font-bold text-slate-500 mb-1">移动 (CM)</label>
                                      <select v-model="probeSys.ping_node_cm" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm">
                                          <option value="default">默认节点 (双栈多节点轮询)</option>
                                          <option v-for="n in pingNodes.cm" :key="n.host" :value="n.host">{{ n.name }}</option>
                                      </select>
                                  </div>

                                  <label class="block text-sm font-bold text-rose-500 mt-6 mb-2">✈️ Telegram 管理与告警设置</label>
                                  <div>
                                      <select v-model="probeSys.tg_notify" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm font-medium text-slate-700 mb-2">
                                          <option value="false">关闭告警 (仅使用机器人控制面板)</option><option value="true">开启告警 (掉线自动推送)</option>
                                      </select>
                                      <input v-model="probeSys.tg_bot_token" placeholder="Bot Token (必须填写以启用机器人命令)" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm mb-2">
                                      <input v-model="probeSys.tg_chat_id" placeholder="Chat ID (管理员ID)" class="w-full bg-white/50 border p-2.5 rounded-xl text-sm">
                                  </div>
                              </div>
                          </div>
                          <div class="kui-settings-save"><span>探针与实时策略的修改尚未保存时，请点击右侧应用。</span><button @click="saveProbeSettings">应用探针配置</button></div>
                      </div>

                      <div class="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40">
                          <h3 class="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">💻 探针服务端管理</h3>
                          <p class="text-sm text-slate-500 mb-6 font-medium">提示：探针大盘已与 KUI Agent 深度统一！您在“服务器与节点”页面接入的机器会<b>自动</b>出现在此处。在这里只需维护展示信息即可，无需再次安装脚本。</p>

                          <div class="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
                              <table class="w-full text-left border-collapse text-sm">
                                  <thead><tr class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100"><th class="p-4">节点名称</th><th class="p-4">分组</th><th class="p-4">状态</th><th class="p-4">操作</th></tr></thead>
                                  <tbody>
                                      <tr v-if="adminProbeServers.length===0"><td colspan="4" class="p-6 text-center text-slate-400">暂无探针，请在上方添加</td></tr>
                                      <tr v-for="s in adminProbeServers" :key="s.id" class="border-b border-slate-50 hover:bg-slate-50">
                                          <td class="p-4 font-bold text-slate-700">{{ s.name }} <span v-if="s.is_hidden==='true'" class="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded">隐藏</span></td>
                                          <td class="p-4">{{ s.server_group || '默认分组' }}</td>
                                          <td class="p-4"><span v-if="isOnline(s.last_updated, s.realtime_state)" class="text-emerald-500 font-bold">● 在线</span><span v-else class="text-rose-500 font-bold">● 离线</span></td>
                                          <td class="p-4 flex gap-2">
                                              <button @click="openProbeEditModal(s)" class="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition">编辑展示信息</button>
                                              <button @click="deleteProbeNode(s.id)" class="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-bold transition">删除记录</button>
                                          </td>
                                      </tr>
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </template>

                  <template v-if="role === 'user'">
                      <div class="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40">
                          <h3 class="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">🔑 账号安全</h3>
                          <div class="max-w-md">
                              <label class="block text-xs font-bold text-slate-400 mb-2 pl-2">修改登录密码</label>
                              <div class="flex gap-3"><input v-model="userNewPassword" type="password" placeholder="请输入新密码" class="w-full bg-white/50 border border-white p-3 rounded-2xl transition hover:bg-white focus:bg-white text-sm font-medium"><button @click="updateUserPassword" class="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-md whitespace-nowrap">确认修改</button></div>
                          </div>
                      </div>
                      <div class="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40">
                          <h3 class="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">🔄 订阅连接重置</h3>
                          <p class="text-sm text-slate-500 mb-4 font-medium">如果您的订阅链接泄露给他人，请立刻在此重置。系统将自动生成全新的独立 UUID 订阅密钥（不影响您的登录密码），旧链接瞬间失效。</p>
                          <button @click="resetMySubLink" class="bg-rose-50 text-rose-600 border border-rose-100 px-6 py-3 rounded-2xl font-bold hover:bg-rose-100 transition-all shadow-sm">⚠️ 重置并吊销旧订阅</button>
                      </div>
                  </template>
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
