<template>
  <div v-if="!isLoggedIn || activeTab === 'probe'" class="probe-body">
              
              <div v-if="showLoginModal" class="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div class="bg-white/80 backdrop-blur-xl border border-white p-6 sm:p-10 rounded-[2rem] shadow-2xl w-full max-w-sm relative">
                      <button @click="showLoginModal = false" class="absolute top-4 right-5 text-2xl text-slate-400 hover:text-slate-600">&times;</button>
                      <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-6 shadow-lg flex items-center justify-center"><span class="text-white text-3xl">✨</span></div>
                      <h2 class="text-3xl font-black mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">系统准入</h2>
                      <input v-model="loginUser" placeholder="用户名 (默认 admin)" class="w-full bg-white/50 border border-white p-4 rounded-2xl mb-4 focus:bg-white transition-all text-slate-700">
                      <input v-model="password" type="password" placeholder="请输入密码" @keyup.enter="login" class="w-full bg-white/50 border border-white p-4 rounded-2xl mb-8 focus:bg-white transition-all text-slate-700">
                      <button @click="login" :disabled="loginPending" class="w-full bg-gradient-to-r from-slate-800 to-black text-white p-4 rounded-2xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:cursor-wait disabled:opacity-60">{{ loginPending ? '登 录 中...' : '登 入 系统' }}</button>
                  </div>
              </div>

              <div v-if="showWelcomePopup && probeSys.enable_popup === 'true'" class="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <div class="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl w-full max-w-lg relative text-center">
                      <div class="text-left leading-relaxed text-[15px] whitespace-pre-wrap max-h-[60vh] overflow-y-auto text-slate-700">{{ probeSys.popup_content }}</div>
                      <button @click="closePopup" class="mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all">我已知晓</button>
                  </div>
              </div>

              <div class="probe-container">
                  <div class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 header">
                      <h1 class="text-2xl font-black m-0 flex items-center gap-3">
                          <span v-if="probeDetailId" @click="probeDetailId = null" class="cursor-pointer text-blue-500 hover:underline text-sm font-medium">⬅ 返回</span>
                          {{ probeSys.site_title || 'Server Monitor Pro' }}
                      </h1>
                      
                      <div class="flex items-center gap-4 flex-wrap" v-if="!probeDetailId">
                          <div class="probe-view-controls view-controls">
                              <button class="probe-toggle-btn toggle-btn" :class="{active: probeView === 'card'}" @click="setProbeView('card')">卡片</button>
                              <button class="probe-toggle-btn toggle-btn" :class="{active: probeView === 'table'}" @click="setProbeView('table')">表格</button>
                              <button class="probe-toggle-btn toggle-btn" :class="{active: probeView === 'map'}" @click="setProbeView('map')">地图</button>
                          </div>
                          <button v-if="!isLoggedIn" @click="showLoginModal = true" class="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-bold text-sm shadow-md hover:opacity-90">👨‍💻 KUI 管理面板</button>
                          <button v-else @click="activeTab = (role === 'admin' ? 'nodes' : 'dashboard')" class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold text-sm shadow-md hover:opacity-90">返回 KUI 面板</button>
                      </div>
                  </div>

                  <div v-if="probeDetailId">
                      <div class="probe-header-card header-card">
                          <div class="flex items-center mb-4">
                              <h2 class="text-xl sm:text-2xl font-black m-0 mr-3 flex items-center card-title-text">
                                  <img v-if="probeDetail.country && probeDetail.country !== 'XX'" :src="'https://flagcdn.com/24x18/' + probeDetail.country.toLowerCase() + '.png'" class="mr-2 rounded-sm">{{ probeDetail.name }}
                              </h2>
                              <span class="px-2.5 py-1 rounded-full text-xs font-bold text-white" :style="{background: isOnline(probeDetail.last_updated, probeDetail.realtime_state) ? '#10b981' : '#ef4444'}">{{ isOnline(probeDetail.last_updated, probeDetail.realtime_state) ? '在线' : '离线' }}</span>
                          </div>
                          <div class="probe-info-grid info-grid">
                              <div class="flex flex-col"><span class="probe-info-label info-label">运行时间</span><span class="font-medium info-value">{{ probeDetail.uptime || 'N/A' }}</span></div>
                              <div class="flex flex-col"><span class="probe-info-label info-label">架构</span><span class="font-medium info-value">{{ probeDetail.arch || 'N/A' }}</span></div>
                              <div class="flex flex-col"><span class="probe-info-label info-label">系统</span><span class="font-medium info-value">{{ probeDetail.os || 'N/A' }}</span></div>
                              <div class="flex flex-col"><span class="probe-info-label info-label">虚拟化</span><span class="font-medium info-value">{{ probeDetail.virt || 'N/A' }}</span></div>
                              <div class="flex flex-col"><span class="probe-info-label info-label">CPU</span><span class="font-medium truncate info-value" :title="probeDetail.cpu_info">{{ probeDetail.cpu_info || 'N/A' }}</span></div>
                              <div class="flex flex-col"><span class="probe-info-label info-label">Load</span><span class="font-medium info-value">{{ probeDetail.load_avg || '0.00' }}</span></div>
                              <div class="flex flex-col"><span class="probe-info-label info-label">上传 / 下载</span><span class="font-medium info-value">{{ formatBytes(probeDetail.net_tx) }} / {{ formatBytes(probeDetail.net_rx) }}</span></div>
                              <div class="flex flex-col"><span class="probe-info-label info-label">启动时间</span><span class="font-medium info-value">{{ probeDetail.boot_time || 'N/A' }}</span></div>
                          </div>
                      </div>
                      
                      <div class="probe-charts-grid charts-grid">
                          <div class="probe-chart-card chart-card"><h3 class="mt-0 text-base flex justify-between">CPU <span class="stat-val">{{ probeDetail.cpu || 0 }}%</span></h3><canvas id="probeChartCPU"></canvas></div>
                          <div class="probe-chart-card chart-card"><h3 class="mt-0 text-base flex justify-between">内存 <span class="stat-val">{{ probeDetail.ram || 0 }}%</span></h3><div class="text-xs text-gray-500 mb-1">Swap: {{ probeDetail.swap_used }} / {{ probeDetail.swap_total }} MiB</div><canvas id="probeChartRAM"></canvas></div>
                          <div class="probe-chart-card chart-card">
                              <h3 class="mt-0 text-base flex justify-between">磁盘 <span class="stat-val">{{ probeDetail.disk || 0 }}%</span></h3>
                              <div class="w-full h-5 bg-gray-200 rounded-full overflow-hidden mt-10"><div id="disk-bar" class="h-full transition-all duration-500" :style="{width: (probeDetail.disk || 0) + '%', background: '#34d399'}"></div></div>
                              <p class="text-right text-xs text-gray-500 mt-2">{{ (probeDetail.disk_used/1024).toFixed(2) }} GiB / {{ (probeDetail.disk_total/1024).toFixed(2) }} GiB</p>
                          </div>
                          <div class="probe-chart-card chart-card"><h3 class="mt-0 text-base flex justify-between">进程数 <span class="stat-val">{{ probeDetail.processes || 0 }}</span></h3><canvas id="probeChartProc"></canvas></div>
                          <div class="probe-chart-card chart-card"><h3 class="mt-0 text-base flex justify-between">网络速度 <span class="text-sm speed-val"><span class="text-emerald-500">↓</span> {{ formatBytes(probeDetail.net_in_speed) }}/s | <span class="text-blue-500">↑</span> {{ formatBytes(probeDetail.net_out_speed) }}/s</span></h3><canvas id="probeChartNet"></canvas></div>
                          <div class="probe-chart-card chart-card"><h3 class="mt-0 text-base flex justify-between">TCP / UDP <span class="text-sm speed-val">TCP {{ probeDetail.tcp_conn || 0 }} | UDP {{ probeDetail.udp_conn || 0 }}</span></h3><canvas id="probeChartConn"></canvas></div>
                          <div class="probe-chart-card probe-chart-full chart-card chart-full">
                              <h3 class="mt-0 text-base flex justify-between">国内延迟追踪 (24小时) <span class="text-xs font-normal speed-val">电信 <b>{{ probeDetail.ping_ct || 0 }}ms</b> | 联通 <b>{{ probeDetail.ping_cu || 0 }}ms</b> | 移动 <b>{{ probeDetail.ping_cm || 0 }}ms</b> | 字节 <b>{{ probeDetail.ping_bd || 0 }}ms</b></span></h3>
                              <canvas id="probeChartPing"></canvas>
                          </div>
                      </div>
                  </div>

                  <div v-else>
                      <div class="probe-filter-bar filter-bar">
                          <span class="probe-filter-tag filter-tag" :class="{active: currentFilter === 'all'}" @click="currentFilter = 'all'">全部 {{ publicProbeServers.length }}</span>
                          <span v-for="(count, code) in probeCountryStats" :key="code" class="probe-filter-tag filter-tag" :class="{active: currentFilter === code}" @click="currentFilter = code">
                              <img :src="'https://flagcdn.com/16x12/' + (code === 'TW' ? 'cn' : code.toLowerCase()) + '.png'"> {{ code }} {{ count }}
                          </span>
                      </div>

                      <div class="probe-global-stats global-stats">
                          <div class="stats-row">
                              <div class="probe-g-item g-item w-full sm:w-auto"><div class="probe-g-label g-label">服务器总数</div><div class="probe-g-val g-val">{{ publicProbeServers.length }}</div><div class="probe-g-sub g-sub">在线 <span class="text-emerald-500">{{ probeGlobalOnline }}</span> | 离线 <span class="text-red-500">{{ probeGlobalOffline }}</span></div></div>
                              <div class="probe-g-item g-item w-full sm:w-auto"><div class="probe-g-label g-label">总计流量 (入 | 出) <span v-if="probeSys.auto_reset_traffic==='true'" class="text-[10px] text-orange-600">(按期重置)</span></div><div class="probe-g-val g-val">{{ formatBytes(probeGlobalNetRx) }} | {{ formatBytes(probeGlobalNetTx) }}</div></div>
                              <div class="probe-g-item g-item w-full sm:w-auto"><div class="probe-g-label g-label">实时网速 (入 | 出)</div><div class="probe-g-val g-val"><span class="text-emerald-500">↓</span> {{ formatBytes(probeGlobalSpeedIn) }}/s | <span class="text-blue-500">↑</span> {{ formatBytes(probeGlobalSpeedOut) }}/s</div></div>
                          </div>
                      </div>

                      <div v-if="probeView === 'card'">
                          <template v-if="Object.keys(filteredProbeGroups).length === 0"><p class="text-center text-gray-500 w-full mt-10">暂无匹配的服务器</p></template>
                          <template v-for="(servers, groupName) in filteredProbeGroups" :key="groupName">
                              <div class="probe-group-header group-header">{{ groupName }}</div>
                              <div class="probe-grid-container grid-container">
                                  <div v-for="s in servers" :key="s.id" @click="openProbeDetail(s.id)" class="probe-vps-card vps-card">
                                      <div class="probe-card-left card-left item-left-bag">
                                          <div class="probe-card-title card-title item-title" :class="isOnline(s.last_updated, s.realtime_state) ? 'is-online' : 'is-offline'">
                                              <div class="probe-status-dot status-dot item-status" :class="isOnline(s.last_updated, s.realtime_state) ? 'is-online' : 'is-offline'" :style="{background: isOnline(s.last_updated, s.realtime_state) ? '#10b981' : '#ef4444'}"></div>
                                              <img v-if="s.country && s.country !== 'XX'" :src="'https://flagcdn.com/24x18/' + (s.country === 'TW' ? 'cn' : s.country.toLowerCase()) + '.png'" class="mr-1.5 rounded-sm">
                                              <span class="text-[15px] truncate card-title-text">{{ s.name }}</span>
                                          </div>
                                          <div class="card-meta-list">
                                              <div v-if="probeSys.show_price === 'true'" class="probe-card-meta card-meta item-meta item-meta-price mt-2">价格: {{ s.price || '免费' }}</div>
                                              <div v-if="probeSys.show_expire === 'true'" class="probe-card-meta card-meta item-meta item-meta-expire" :class="probeSys.show_price!=='true'?'mt-2':''">剩余天数: {{ getExpireText(s.expire_date) }}</div>
                                              <div class="probe-card-meta card-meta item-meta item-meta-traffic" :class="probeSys.show_price!=='true'&&probeSys.show_expire!=='true'?'mt-2':''">流量: <span class="text-emerald-500">↓</span> {{ formatBytes(s[probeSys.auto_reset_traffic === 'true' ? 'monthly_rx' : 'net_rx']) }} | <span class="text-blue-500">↑</span> {{ formatBytes(s[probeSys.auto_reset_traffic === 'true' ? 'monthly_tx' : 'net_tx']) }}</div>
                                              <div class="probe-card-meta card-meta item-meta item-meta-uptime mt-0.5">在线: {{ (s.uptime||'-').replace('days','天').replace('day','天') }} | 更新: {{ Math.round((Date.now() - s.last_updated)/1000) }}s前</div>
                                          </div>
                                          
                                          <div class="probe-card-badges card-badges item-badges">
                                              <span v-if="probeSys.show_bw === 'true' && s.bandwidth" class="probe-badge badge probe-badge-bw badge-bw">{{ s.bandwidth }}</span>
                                              <span v-if="probeSys.show_tf === 'true' && s.traffic_limit" class="probe-badge badge probe-badge-tf badge-tf">{{ s.traffic_limit }}</span>
                                              <span v-if="s.ip_v4 === '1'" class="probe-badge badge probe-badge-v4 badge-v4">IPv4</span>
                                              <span v-if="s.ip_v6 === '1'" class="probe-badge badge probe-badge-v6 badge-v6">IPv6</span>
                                          </div>
                                          <div class="item-ping">
                                              <div class="probe-ping-box ping-box">
                                                  <span class="ping-item">电信 <span class="font-bold" :style="{color: getPingColor(s.ping_ct)}">{{ s.ping_ct === '0' ? '超时' : s.ping_ct + 'ms' }}</span></span>
                                                  <span class="ping-item">联通 <span class="font-bold" :style="{color: getPingColor(s.ping_cu)}">{{ s.ping_cu === '0' ? '超时' : s.ping_cu + 'ms' }}</span></span>
                                                  <span class="ping-item">移动 <span class="font-bold" :style="{color: getPingColor(s.ping_cm)}">{{ s.ping_cm === '0' ? '超时' : s.ping_cm + 'ms' }}</span></span>
                                                  <span class="ping-item">字节 <span class="font-bold" :style="{color: getPingColor(s.ping_bd)}">{{ s.ping_bd === '0' ? '超时' : s.ping_bd + 'ms' }}</span></span>
                                              </div>
                                          </div>
                                      </div>
                                      <div class="probe-card-right card-right item-right-bag">
                                          <div class="probe-stat-group stat-group item-cpu">
                                              <div class="probe-stat-header stat-header"><span class="stat-label">CPU</span><span class="stat-val" :style="{color: s.cpu>80?'#ef4444':''}">{{ parseFloat(s.cpu||0).toFixed(1) }}%</span></div>
                                              <div class="probe-stat-bar-full stat-bar-full" :style="{'--percent': Math.min(Math.max(Number(s.cpu) || 0, 0), 100) + '%'}"><div class="stat-bar-inner" :style="{width: s.cpu+'%', background: s.cpu>80?'#ef4444':'#3b82f6'}"></div></div>
                                              <div class="probe-stat-subtext stat-subtext" :title="s.cpu_info">{{ s.cpu_info || '-' }}</div>
                                          </div>
                                          <div class="probe-stat-group stat-group item-ram">
                                              <div class="probe-stat-header stat-header"><span class="stat-label">内存</span><span class="stat-val" :style="{color: s.ram>80?'#ef4444':''}">{{ parseFloat(s.ram||0).toFixed(1) }}%</span></div>
                                              <div class="probe-stat-bar-full stat-bar-full" :style="{'--percent': Math.min(Math.max(Number(s.ram) || 0, 0), 100) + '%'}"><div class="stat-bar-inner" :style="{width: s.ram+'%', background: s.ram>80?'#ef4444':'#10b981'}"></div></div>
                                              <div class="probe-stat-subtext stat-subtext">{{ formatBytes(s.ram_used*1048576) }} / {{ formatBytes(s.ram_total*1048576) }}</div>
                                          </div>
                                          <div class="probe-stat-group stat-group item-disk">
                                              <div class="probe-stat-header stat-header"><span class="stat-label">存储</span><span class="stat-val" :style="{color: s.disk>80?'#ef4444':''}">{{ parseFloat(s.disk||0).toFixed(1) }}%</span></div>
                                              <div class="probe-stat-bar-full stat-bar-full" :style="{'--percent': Math.min(Math.max(Number(s.disk) || 0, 0), 100) + '%'}"><div class="stat-bar-inner" :style="{width: s.disk+'%', background: s.disk>80?'#ef4444':'#10b981'}"></div></div>
                                              <div class="probe-stat-subtext stat-subtext">{{ formatBytes(s.disk_used*1048576) }} / {{ formatBytes(s.disk_total*1048576) }}</div>
                                          </div>
                                          <div class="flex justify-between text-[11px] text-gray-500 mt-0.5 item-sysinfo">
                                              <div class="truncate mr-1 stat-subtext" :title="s.os+' | '+s.arch+' | '+s.virt">{{ s.os || '-' }} | {{ s.arch || '-' }} | {{ s.virt || '-' }}</div>
                                              <div class="shrink-0 stat-subtext">TCP/UDP: {{ s.tcp_conn||0 }} / {{ s.udp_conn||0 }}</div>
                                          </div>
                                          <div class="flex justify-between text-[11px] text-gray-500 mt-1 item-speed">
                                              <div class="stat-subtext"><span class="text-emerald-500">↓</span> {{ formatBytes(s.net_in_speed) }}/s</div>
                                              <div class="stat-subtext"><span class="text-blue-500">↑</span> {{ formatBytes(s.net_out_speed) }}/s</div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </template>
                      </div>

                      <div v-if="probeView === 'table'" class="overflow-x-auto">
                          <table class="probe-custom-table custom-table">
                              <thead><tr><th>状态</th><th>节点名称</th><th>地区</th><th>系统/架构/虚拟化</th><th>CPU</th><th>内存</th><th>磁盘</th><th>流量(入|出)</th><th>下行</th><th>上行</th><th>更新</th></tr></thead>
                              <tbody>
                                  <tr v-if="filteredProbeServers.length===0"><td colspan="11" class="text-center">暂无数据</td></tr>
                                  <tr v-for="s in filteredProbeServers" :key="s.id" @click="openProbeDetail(s.id)">
                                      <td class="text-center"><div class="probe-status-dot status-dot inline-block m-0" :style="{background: isOnline(s.last_updated, s.realtime_state) ? '#10b981' : '#ef4444'}"></div></td>
                                      <td><b class="card-title-text">{{ s.name }}</b></td>
                                      <td><img v-if="s.country && s.country!=='XX'" :src="'https://flagcdn.com/24x18/' + (s.country === 'TW' ? 'cn' : s.country.toLowerCase()) + '.png'"></td>
                                      <td><span class="text-xs text-gray-500 os-text">{{ s.os||'-' }} / {{ s.arch||'-' }} / {{ s.virt||'-' }}</span></td>
                                      <td class="min-w-[100px]"><div class="flex items-center gap-2"><div class="w-[50px] h-1 bg-gray-200 rounded-sm overflow-hidden probe-stat-bar stat-bar"><div class="h-full bg-blue-500" :style="{width: s.cpu+'%'}"></div></div><span class="stat-val">{{ parseFloat(s.cpu||0).toFixed(1) }}%</span></div></td>
                                      <td class="min-w-[100px]"><div class="flex items-center gap-2"><div class="w-[50px] h-1 bg-gray-200 rounded-sm overflow-hidden probe-stat-bar stat-bar"><div class="h-full bg-emerald-500" :style="{width: s.ram+'%'}"></div></div><span class="stat-val">{{ parseFloat(s.ram||0).toFixed(1) }}%</span></div></td>
                                      <td class="min-w-[100px]"><div class="flex items-center gap-2"><div class="w-[50px] h-1 bg-gray-200 rounded-sm overflow-hidden probe-stat-bar stat-bar"><div class="h-full bg-emerald-500" :style="{width: s.disk+'%'}"></div></div><span class="stat-val">{{ parseFloat(s.disk||0).toFixed(1) }}%</span></div></td>
                                      <td class="text-xs text-gray-500 card-meta">{{ formatBytes(s[probeSys.auto_reset_traffic === 'true' ? 'monthly_rx' : 'net_rx']) }} | {{ formatBytes(s[probeSys.auto_reset_traffic === 'true' ? 'monthly_tx' : 'net_tx']) }}</td>
                                      <td class="stat-val">{{ formatBytes(s.net_in_speed) }}/s</td>
                                      <td class="stat-val">{{ formatBytes(s.net_out_speed) }}/s</td>
                                      <td class="text-xs text-gray-500 card-meta">{{ Math.round((Date.now() - s.last_updated)/1000) }} 秒前</td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>

                      <div v-show="probeView === 'map'">
                          <div id="map-container"></div>
                      </div>

                  </div>
                  
                  <div class="text-center mt-10 pb-5 text-sm opacity-80 card-meta">
                      <div class="mb-2"><span class="mr-4">👁️ 历史总访问：<b class="text-blue-500 stat-val">{{ probeSys.visits_total || 0 }}</b> 次</span><span>🔥 今日访问：<b class="text-emerald-500 stat-val">{{ probeSys.visits_today || 0 }}</b> 次</span></div>
                      Powered by KUI Core x CF-Server-Monitor-Pro
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
