<template>
  <div v-if="role === 'admin' && activeTab === 'nodes'" class="kui-servers-page space-y-8">
                  <div class="kui-server-stats grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div class="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] border border-white shadow-lg shadow-indigo-100/30 text-center"><div class="text-[10px] text-slate-400 font-bold mb-1 tracking-widest">在线服务器</div><div class="text-3xl font-black text-slate-700">{{ globalOnline }} / {{ servers.length }}</div></div>
                      <div class="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] border border-white shadow-lg shadow-indigo-100/30 text-center"><div class="text-[10px] text-slate-400 font-bold mb-1 tracking-widest">累计流量</div><div class="text-3xl font-black text-slate-700">{{ formatBytes(globalTraffic) }}</div></div>
                      <div class="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] border border-white shadow-lg shadow-indigo-100/30 text-center"><div class="text-[10px] text-slate-400 font-bold mb-1 tracking-widest">实时下载</div><div class="text-2xl font-black text-emerald-500 truncate">↓ {{ formatBytes(globalSpeedIn) }}/s</div></div>
                      <div class="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] border border-white shadow-lg shadow-indigo-100/30 text-center"><div class="text-[10px] text-slate-400 font-bold mb-1 tracking-widest">实时上传</div><div class="text-2xl font-black text-blue-500 truncate">↑ {{ formatBytes(globalSpeedOut) }}/s</div></div>
                  </div>

                  <div class="kui-server-grid grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <div v-for="vps in servers" :key="vps.ip" class="kui-server-card bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white shadow-xl shadow-slate-200/40 flex flex-col overflow-hidden transition-all hover:shadow-2xl">
                          <div class="p-6 md:p-8 relative">
                              <div class="flex justify-between items-start mb-4">
                                  <div class="kui-server-heading min-w-0 flex-1 pr-2">
                                      <h3 class="font-black text-2xl text-slate-800 flex items-center gap-2 min-w-0">
                                          <span class="kui-server-name truncate">{{ vps.name }}</span>
                                          <span :class="vps.realtime_state === 'stale' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : (isOnline(vps.last_report, vps.realtime_state) ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]')" class="kui-server-status-dot w-3 h-3 rounded-full inline-block"></span>
                                          <span class="kui-server-ip text-xs font-mono text-slate-400 font-medium">{{ vps.ip }}</span>
                                      </h3>
                                  </div>
                                  <details class="kui-server-menu">
                                      <summary class="kui-card-menu" title="服务器操作" aria-label="打开服务器操作菜单">•••</summary>
                                      <div class="kui-server-menu-panel">
                                          <div class="kui-server-menu-label">所有协议</div>
                                          <button @click="$event.currentTarget.closest('details').removeAttribute('open'); copyCommand(generateSubLink(vps.ip, ''), '该服务器全部协议的普通订阅已复制！')">复制所有协议普通订阅</button>
                                          <button @click="$event.currentTarget.closest('details').removeAttribute('open'); copyCommand(generateSubLink(vps.ip, 'clash'), '该服务器全部协议的 Clash 订阅已复制！')">复制所有协议 Clash 订阅</button>
                                          <button @click="$event.currentTarget.closest('details').removeAttribute('open'); copySurgeConfig(vps.ip)">复制所有协议 Surge 配置段</button>
                                          <details class="kui-server-command-menu">
                                              <summary>部署与卸载命令 <span aria-hidden="true">›</span></summary>
                                              <div class="kui-server-command-panel">
                                                  <div class="kui-server-command-heading">
                                                      <strong>部署与卸载命令</strong>
                                                      <div>
                                                          <label><input type="radio" v-model="deployOsMap[vps.ip]" @change="saveOsMap" value="debian"> Ubuntu/Debian</label>
                                                          <label><input type="radio" v-model="deployOsMap[vps.ip]" @change="saveOsMap" value="alpine"> Alpine</label>
                                                      </div>
                                                  </div>
                                                  <button @click="copyCommand(generateCmd(vps.ip), '部署指令已复制！')" class="kui-copy-deploy-button">复制完整部署命令</button>
                                                  <button @click="copyUninstallCommand(vps)" class="kui-copy-agent-uninstall-button">复制 Agent 卸载命令（保留住宅代理）</button>
                                                  <button @click="copyPurgeCommand(vps)" class="kui-copy-purge-button" title="卸载全部组件并移除面板记录">复制完整卸载命令</button>
                                              </div>
                                          </details>
                                      </div>
                                  </details>
                              </div>
                              <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                                  <div class="kui-server-metric bg-white/50 p-3 rounded-2xl border border-white shadow-sm flex flex-col justify-between"><div class="text-[9px] text-slate-400 font-bold tracking-wider mb-1">CPU</div><div class="font-black text-lg text-slate-700">{{ vps.cpu || 0 }}%</div><div class="w-full bg-slate-200/50 rounded-full h-1 mt-1 overflow-hidden"><div class="bg-indigo-400 h-1 rounded-full" :style="{ width: (vps.cpu || 0) + '%' }"></div></div></div>
                                  <div class="kui-server-metric bg-white/50 p-3 rounded-2xl border border-white shadow-sm flex flex-col justify-between"><div class="text-[9px] text-slate-400 font-bold tracking-wider mb-1">MEM</div><div class="font-black text-lg text-slate-700">{{ vps.mem || 0 }}%</div><div class="w-full bg-slate-200/50 rounded-full h-1 mt-1 overflow-hidden"><div class="bg-purple-400 h-1 rounded-full" :style="{ width: (vps.mem || 0) + '%' }"></div></div></div>
                                  <div class="kui-server-metric bg-white/50 p-3 rounded-2xl border border-white shadow-sm flex flex-col justify-between"><div class="text-[9px] text-slate-400 font-bold tracking-wider mb-1">DISK</div><div class="font-black text-lg text-slate-700">{{ vps.disk || 0 }}%</div><div class="w-full bg-slate-200/50 rounded-full h-1 mt-1 overflow-hidden"><div class="bg-emerald-400 h-1 rounded-full" :style="{ width: (vps.disk || 0) + '%' }"></div></div></div>
                                  <div class="kui-server-metric bg-white/50 p-2 rounded-2xl border border-white shadow-sm flex flex-col justify-center text-center"><div class="text-[9px] text-slate-400 font-bold tracking-wider mb-1">SPEED</div><div class="text-[10px] font-black text-emerald-500 truncate">↓ {{ formatBytes(vps.net_in_speed || 0) }}/s</div><div class="text-[10px] font-black text-blue-500 truncate mt-0.5">↑ {{ formatBytes(vps.net_out_speed || 0) }}/s</div></div>
                              </div>
                              <div class="kui-server-chart bg-white/40 p-4 rounded-2xl border border-white"><div class="text-[10px] text-slate-400 font-bold tracking-wider mb-2">7-DAY TRAFFIC TREND</div><div :id="'chart-' + vps.ip" class="w-full h-32"></div></div>
                              <div class="kui-egress-panel bg-sky-50/70 p-4 rounded-[1.5rem] border border-sky-100 mt-3">
                                  <div class="mb-3"><div class="text-xs font-black text-sky-700 tracking-wider">节点出口</div><div class="text-[10px] text-sky-500/80 mt-0.5">手动下拉选择；系统保证 SOCKS5 与 WARP 不会同时启用</div></div>
                                  <select :value="egressModeOf(vps)" @change="onEgressModeChange(vps, $event.target.value)" :disabled="vps.egress_status === 'pending'" class="w-full bg-white border border-sky-200 p-3 rounded-xl text-sm font-black text-slate-700 outline-none disabled:opacity-50">
                                      <option value="native">原生出口</option>
                                      <option value="warp_ipv4">WARP IPv4</option>
                                      <option value="warp_ipv6">WARP IPv6</option>
                                      <option value="warp_dual">WARP 双栈</option>
                                      <option value="residential">住宅 IP 代理</option>
                                      <option value="socks5">手动 SOCKS5</option>
                                  </select>
                                  <div v-if="egressModeOf(vps) === 'residential'" class="mt-3">
                                      <div class="flex gap-2 mb-2">
                                          <button @click="setProxyMode(vps, 'residential', 'global')" :class="proxyModeOf(vps) === 'global' ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-slate-600 border border-sky-200'" class="flex-1 py-2 rounded-xl text-xs font-black transition-all">全局代理</button>
                                          <button @click="setProxyMode(vps, 'residential', 'selective')" :class="proxyModeOf(vps) === 'selective' ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-slate-600 border border-sky-200'" class="flex-1 py-2 rounded-xl text-xs font-black transition-all">局部代理</button>
                                      </div>
                                      <div v-if="proxyModeOf(vps) === 'selective'" class="flex flex-wrap gap-1.5 mb-2">
                                          <button v-for="cat in proxyCategoryOptions" :key="cat.key" @click="toggleProxyCategory(vps, cat.key)" :class="proxyCategoryActive(vps, cat.key) ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200'" class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all">{{ cat.label }}</button>
                                      </div>
                                      <button v-if="proxyModeOf(vps) === 'selective' && vps._proxy_categories_dirty" @click="applyProxyCategories(vps)" :disabled="vps.egress_status === 'pending'" class="w-full mb-2 rounded-xl bg-indigo-600 py-2 text-xs font-black text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">应用已选分类</button>
                                      <div class="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-700">⚠ “全局代理”仅覆盖 KUI Agent 管理的节点入站流量，不会接管 VPS 系统默认路由；局部代理仅覆盖所选服务分类。</div>
                                      <div class="mt-2 rounded-xl px-3 py-2 text-[10px] font-black" :class="vps.residential_ready ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-rose-200 bg-rose-50 text-rose-700'">
                                          <template v-if="vps.residential_ready">
                                              <div>住宅通道已就绪</div>
                                              <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                                                  <span class="font-sans">当前实时住宅出口：</span>
                                                  <span>主 {{ vps.residential_active_exit_ip || '等待就绪' }}</span>
                                                  <span>备 {{ vps.residential_standby_exit_ip || '等待就绪' }}</span>
                                              </div>
                                          </template>
                                          <span v-else>住宅通道未就绪：{{ vps.residential_reason || '等待状态上报' }}</span>
                                      </div>
                                  </div>
                                  <div v-if="egressModeOf(vps) === 'socks5'" class="mt-3 space-y-2">
                                      <div class="grid grid-cols-3 gap-2">
                                          <input v-model="vps._socks5_addr" placeholder="地址" class="col-span-2 bg-white border border-sky-200 p-2 rounded-xl text-sm font-medium text-slate-700 outline-none">
                                          <input v-model.number="vps._socks5_port" placeholder="端口" type="number" class="bg-white border border-sky-200 p-2 rounded-xl text-sm font-medium text-slate-700 outline-none">
                                      </div>
                                      <div class="grid grid-cols-2 gap-2">
                                          <input v-model="vps._socks5_user" placeholder="用户名（可选）" class="bg-white border border-sky-200 p-2 rounded-xl text-sm font-medium text-slate-700 outline-none">
                                          <input v-model="vps._socks5_pass" placeholder="密码（可选）" type="password" class="bg-white border border-sky-200 p-2 rounded-xl text-sm font-medium text-slate-700 outline-none">
                                      </div>
                                      <div class="flex gap-2 mb-1">
                                          <button @click="setProxyMode(vps, 'socks5', 'global')" :class="proxyModeOf(vps) === 'global' ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-slate-600 border border-sky-200'" class="flex-1 py-2 rounded-xl text-xs font-black transition-all">全局代理</button>
                                          <button @click="setProxyMode(vps, 'socks5', 'selective')" :class="proxyModeOf(vps) === 'selective' ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-slate-600 border border-sky-200'" class="flex-1 py-2 rounded-xl text-xs font-black transition-all">局部代理</button>
                                      </div>
                                      <div v-if="proxyModeOf(vps) === 'selective'" class="flex flex-wrap gap-1.5 mb-1">
                                          <button v-for="cat in proxyCategoryOptions" :key="cat.key" @click="toggleProxyCategory(vps, cat.key)" :class="proxyCategoryActive(vps, cat.key) ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200'" class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all">{{ cat.label }}</button>
                                      </div>
                                      <button v-if="proxyModeOf(vps) === 'selective' && vps._proxy_categories_dirty" @click="applyProxyCategories(vps)" :disabled="vps.egress_status === 'pending'" class="w-full mb-2 rounded-xl bg-indigo-600 py-2 text-xs font-black text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">应用已选分类</button>
                                      <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-700">⚠ 填写 SOCKS5 代理地址后点击全局/局部代理按钮应用。</div>
                                  </div>
                                  <div v-if="egressModeOf(vps) === 'native'" class="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-700">VPS 本机原生网络出口，不经过任何代理或隧道。</div>
                                  <div v-if="egressModeOf(vps).startsWith('warp_')" class="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-700">⚠ WARP 出口基于 WireGuard 隧道，不会与住宅/SOCKS5 出口冲突。</div>
                                  <div class="mt-3 text-[10px] font-bold" :class="vps.egress_status === 'pending' ? 'text-amber-500' : (vps.egress_status === 'failed' ? 'text-rose-500' : (vps.egress_status === 'applied' ? 'text-emerald-500' : 'text-slate-500'))">
                                      <span v-if="vps.egress_status === 'pending'">● 正在应用新配置</span>
                                      <span v-else-if="vps.egress_status === 'applied'">● 配置已同步<span class="ml-1 text-slate-500">· {{ egressModeLabel(vps.egress_applied_mode) }}</span></span>
                                      <span v-else-if="vps.egress_status === 'failed'">● 新配置应用失败，当前配置保持不变</span>
                                      <span v-else>● 等待 VPS 上线后同步</span>
                                      <div v-if="vps.egress_status === 'pending'" class="mt-1 text-slate-500">当前出口：{{ egressModeLabel(vps.egress_applied_mode) }}；目标：{{ egressModeLabel(vps.egress_mode) }}</div>
                                      <div v-else-if="vps.egress_status === 'failed'" class="mt-1">当前出口：{{ egressModeLabel(vps.egress_applied_mode) }}；原因：{{ vps.egress_error || '未知错误' }}</div>
                                      <div v-if="vps.egress_status === 'applied'" class="mt-1 flex items-end justify-between gap-3 text-slate-500">
                                          <span class="min-w-0 flex-1">配置应用时验证出口：<span class="break-all font-mono text-indigo-500">{{ vps.egress_ip || '--' }}</span></span>
                                          <span class="ml-auto whitespace-nowrap font-mono text-slate-400">版本 {{ vps.egress_applied_revision || 0 }}</span>
                                      </div>
                                      <div v-else-if="vps.egress_status === 'pending'" class="mt-1 font-mono text-slate-400">版本 {{ vps.egress_applied_revision || 0 }} → {{ vps.egress_revision || 0 }}</div>
                                      <div v-else class="mt-1 font-mono text-slate-400">当前版本 {{ vps.egress_applied_revision || 0 }}，目标版本 {{ vps.egress_revision || 0 }}</div>
                                  </div>
                                  <button v-if="vps.egress_status !== 'pending' && (vps.egress_status === 'failed' || Number(vps.egress_revision || 0) !== Number(vps.egress_applied_revision || 0))" @click="forceReapplyEgress(vps)" class="mt-2 w-full rounded-xl border border-sky-200 bg-white py-2 text-[11px] font-black text-sky-700 hover:bg-sky-50">重新下发当前出口配置</button>
                              </div>
                          </div>

                          <details class="kui-server-tools">
                              <summary><span>配置与节点管理</span><small>{{ getNodesByIp(vps.ip).length }} 个节点</small></summary>
                              <div class="px-6 md:px-8 pb-4">
                              <div class="kui-quick-deploy-panel bg-indigo-50/70 border-2 border-dashed border-indigo-200 p-6 rounded-[1.5rem] mb-2 relative overflow-hidden group shadow-sm hover:border-indigo-300 transition-all">
                                  <div class="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-sm">QUICK INSTALL</div>
                                  <h4 class="font-black text-indigo-800 text-lg mb-2 flex items-center gap-2">🚀 极速全量节点下发 (9合1)</h4>
                                  <p class="text-xs text-indigo-500/80 font-bold mb-5 leading-relaxed">输入起始端口，系统将依次为您生成 8 个稳定防封协议阵列：XTLS+Reality, Hysteria2, TUIC, Trojan, H2+Reality, gRPC+Reality, AnyTLS, Naive。</p>
                                  <div class="flex flex-col md:flex-row gap-4 mb-2">
                                      <div class="flex-1"><label class="block text-[10px] text-indigo-400 font-bold mb-1 pl-1">归属用户设置</label><select v-model="batchUser[vps.ip]" class="w-full bg-white border border-indigo-100 text-indigo-700 font-bold text-sm p-3.5 rounded-xl outline-none focus:shadow-md transition"><option value="admin">👤 管理员自身</option><option v-for="u in users" :value="u.username">👤 {{ u.username }}</option></select></div>
                                      <div class="flex-1"><label class="block text-[10px] text-indigo-400 font-bold mb-1 pl-1">起始端口 (建议 8881)</label><input v-model="batchStartPort[vps.ip]" type="number" placeholder="例如: 8881" class="w-full bg-white border border-indigo-100 p-3.5 rounded-xl outline-none text-sm font-mono text-indigo-900 focus:shadow-md transition"></div>
                                      <div class="flex items-end"><button @click="deployAllProtocols(vps.ip)" class="h-[50px] bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-8 rounded-xl text-sm font-black shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap">🚀 爆发下发</button></div>
                                  </div>
                              </div>

                              <div class="kui-node-deploy-panel bg-gradient-to-br from-white/80 to-white/40 p-5 rounded-[1.5rem] border border-white shadow-sm mt-4">
                                  <div class="text-xs font-bold text-slate-400 mb-2 pl-1">手动单节点精细化下发</div>
                                  <select v-model="newNodeParams[vps.ip].username" class="w-full border-none bg-indigo-50/50 text-indigo-700 font-bold text-sm p-3 rounded-xl outline-none mb-3"><option value="admin">👤 归属权: 管理员自身</option><option v-for="u in users" :value="u.username">👤 归属权: {{ u.username }}</option></select>
                                  <div class="flex gap-3 mb-3">
                                      <select v-model="newNodeParams[vps.ip].protocol" class="border-none bg-slate-100/50 text-slate-700 text-sm p-3 rounded-xl flex-1 outline-none font-medium"><option value="XTLS-Reality">XTLS + Reality</option><option value="Hysteria2">Hysteria2 (极速)</option><option value="TUIC">TUIC v5 (高并发)</option><option value="Shadowsocks2022">Shadowsocks 2022</option><option value="Trojan">Trojan</option><option value="H2-Reality">H2 + Reality</option><option value="gRPC-Reality">gRPC + Reality</option><option value="AnyTLS">AnyTLS</option><option value="Naive">Naive</option><option disabled>──────────</option><option value="VLESS-Argo">VLESS Argo (IP被封)</option><option value="dokodemo-door">Dokodemo (内部转发)</option></select>
                                      <input v-model="newNodeParams[vps.ip].port" type="number" placeholder="端口" class="bg-slate-100/50 text-slate-700 text-sm p-3 rounded-xl w-24 outline-none font-mono">
                                  </div>
                                  <div class="grid grid-cols-2 gap-3 mb-3">
                                      <div class="bg-slate-100/50 p-3 rounded-xl"><label class="block text-[10px] text-slate-400 font-bold mb-1">配额(GB, 0无限)</label><input v-model="newNodeParams[vps.ip].traffic_limit_gb" type="number" class="w-full text-sm bg-transparent outline-none font-bold text-slate-700"></div>
                                      <div class="bg-slate-100/50 p-3 rounded-xl"><label class="block text-[10px] text-slate-400 font-bold mb-1">到期日(留空永久)</label><input v-model="newNodeParams[vps.ip].expire_date" type="date" class="w-full text-sm bg-transparent outline-none font-bold text-slate-700"></div>
                                  </div>
                                  <div v-if="['XTLS-Reality', 'H2-Reality', 'gRPC-Reality'].includes(newNodeParams[vps.ip].protocol)" class="bg-slate-100/50 p-3 rounded-xl mb-3"><input v-model="newNodeParams[vps.ip].sni" :list="'sni-rec-' + vps.ip" placeholder="伪装域名: 支持手填或下拉" class="w-full bg-transparent outline-none text-sm font-medium text-slate-700"><datalist :id="'sni-rec-' + vps.ip"><option value="addons.mozilla.org"></option><option value="www.apple.com"></option><option value="gateway.icloud.com"></option><option value="itunes.apple.com"></option><option value="www.microsoft.com"></option></datalist></div>
                                  <div v-if="['TUIC', 'Hysteria2', 'Trojan', 'AnyTLS', 'Naive'].includes(newNodeParams[vps.ip].protocol)" class="bg-slate-100/50 p-3 rounded-xl mb-3"><input v-model="newNodeParams[vps.ip].sni" placeholder="SNI 域名 / 主机名" class="w-full bg-transparent outline-none text-sm font-medium text-slate-700"></div>
                                  <div v-if="newNodeParams[vps.ip].protocol === 'Shadowsocks2022'" class="bg-slate-100/50 p-3 rounded-xl mb-3">
                                      <label class="block text-[10px] text-slate-400 font-bold mb-1">SS2022 加密方式</label>
                                      <select v-model="newNodeParams[vps.ip].ss_method" @change="newNodeParams[vps.ip].ss_password = generateSs2022Password(newNodeParams[vps.ip].ss_method)" class="w-full bg-transparent outline-none text-sm font-medium text-slate-700">
                                          <option value="2022-blake3-aes-256-gcm">2022-blake3-aes-256-gcm</option>
                                          <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                                      </select>
                                      <label class="block text-[10px] text-slate-400 font-bold mt-3 mb-1">SS2022 密码（Base64 原始密钥）</label>
                                      <div class="flex gap-2">
                                          <input v-model.trim="newNodeParams[vps.ip].ss_password" type="text" spellcheck="false" autocomplete="off" placeholder="16 字节=24 字符，32 字节=44 字符" class="min-w-0 flex-1 bg-white rounded-lg px-2 py-2 text-xs font-mono text-slate-700 outline-none border border-slate-200">
                                          <button type="button" @click="newNodeParams[vps.ip].ss_password = generateSs2022Password(newNodeParams[vps.ip].ss_method)" class="shrink-0 rounded-lg border border-sky-200 bg-white px-2 text-[10px] font-bold text-sky-700 hover:bg-sky-50">随机生成</button>
                                      </div>
                                  </div>
                                  <div v-if="newNodeParams[vps.ip].protocol === 'dokodemo-door'" class="bg-slate-100/50 p-3 rounded-xl mb-3 space-y-2">
                                      <select v-model="newNodeParams[vps.ip].relay_type" class="w-full bg-white p-2 rounded-lg text-sm"><option value="external">外部目标地址</option><option value="internal">面板内部节点</option></select>
                                      <div v-if="newNodeParams[vps.ip].relay_type === 'external'" class="grid grid-cols-2 gap-2"><input v-model="newNodeParams[vps.ip].target_ip" placeholder="目标 IP/域名" class="bg-white p-2 rounded-lg text-sm"><input v-model.number="newNodeParams[vps.ip].target_port" type="number" placeholder="目标端口" class="bg-white p-2 rounded-lg text-sm"></div>
                                      <select v-else v-model="newNodeParams[vps.ip].target_id" class="w-full bg-white p-2 rounded-lg text-sm"><option value="">选择目标节点</option><option v-for="target in nodes.filter(n => n.id && n.protocol !== 'dokodemo-door')" :value="target.id">{{ getVpsName(target.vps_ip) }} · {{ target.protocol }}:{{ target.port }}</option></select>
                                  </div>
                                  <button @click="addNode(vps.ip)" class="w-full bg-gradient-to-r from-slate-800 to-black text-white py-3 rounded-xl font-bold shadow-lg transition-all hover:scale-[1.02]">添加单节点</button>
                              </div>
                              </div>
                          </details>

                          <div class="kui-node-list-section p-6 md:p-8 bg-slate-50/50 border-t border-white flex-1">
                              <details v-for="node in getNodesByIp(vps.ip)" :key="node.id" class="kui-node-card mb-3">
                                  <summary class="kui-node-summary">
                                      <span class="kui-node-summary-protocol">{{ node.protocol }}</span>
                                      <span class="kui-node-summary-user">👤 {{ node.username }}</span>
                                      <span class="kui-node-summary-traffic">已用流量 {{ formatBytes(node.traffic_used) }}</span>
                                      <span class="kui-node-summary-chevron" aria-hidden="true">⌄</span>
                                  </summary>
                                  <div class="kui-node-details">
                                      <div class="kui-node-details-heading">
                                          <div>
                                              <strong>节点详细配置</strong>
                                              <span :class="node.enable === 1 ? 'is-enabled' : 'is-disabled'">{{ node.enable === 1 ? '已启用' : '已停用' }}</span>
                                          </div>
                                          <div class="kui-node-actions">
                                              <button @click="toggleNode(node.id, node.enable === 1 ? 0 : 1)">{{ node.enable === 1 ? '停用' : '启用' }}</button>
                                              <button class="is-danger" @click="deleteNode(node.id)">删除</button>
                                          </div>
                                      </div>
                                      <dl class="kui-node-detail-grid">
                                          <div v-for="row in buildNodeDetailRows(node)" :key="row.label">
                                              <dt>{{ row.label }}</dt>
                                              <dd>{{ row.value }}</dd>
                                          </div>
                                      </dl>
                                      <div class="kui-node-usage">
                                          <div class="kui-node-usage-labels">
                                              <span>流量：{{ formatBytes(node.traffic_used) }}<template v-if="node.traffic_limit > 0"> / {{ formatBytes(node.traffic_limit) }}</template><template v-else> / 不限</template></span>
                                              <span>到期：{{ node.expire_time > 0 ? formatDate(node.expire_time) : '永久' }}</span>
                                          </div>
                                          <div class="kui-node-usage-bar"><i :class="(node.traffic_limit > 0 && node.traffic_used >= node.traffic_limit) ? 'is-exhausted' : ''" :style="{ width: getTrafficPercent(node.traffic_used, node.traffic_limit) + '%' }"></i></div>
                                          <button v-if="node.traffic_used > 0" @click="resetTraffic(node.id)">清零已用流量</button>
                                      </div>
                                      <div class="kui-node-export-actions">
                                          <button @click="copyCommand(generateSubLink(vps.ip, '', node.id), '该节点普通订阅已复制！')">复制普通订阅</button>
                                          <button @click="copyCommand(generateSubLink(vps.ip, 'clash', node.id), '该节点 Clash 订阅已复制！')">复制 Clash 订阅</button>
                                          <button @click="copySurgeConfig(vps.ip, node.id)">复制 Surge 配置段</button>
                                      </div>
                                  </div>
                              </details>
                              <div v-if="getNodesByIp(vps.ip).length === 0" class="text-center text-slate-400 text-xs py-6 border-2 border-dashed border-slate-200 rounded-2xl font-medium">节点矩阵为空，请在上方一键下发建立</div>
                          </div>
                      </div>
                  </div>
              </div>
</template>

<script>
import { inject } from 'vue';
import { KUI_KEY } from '../app/context.js';
import { buildNodeDetailRows } from '../utils/nodeDetails.js';

export default {
  setup() {
    return { ...inject(KUI_KEY), buildNodeDetailRows };
  },
};
</script>
