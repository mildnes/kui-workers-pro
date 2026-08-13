#!/bin/sh

set -eu

CONFIRMED=0
EXPECTED_IP=""
API_URL=""
TOKEN=""
BOOTSTRAP=""
PURGE_ALL=0
while [ "$#" -gt 0 ]; do
    case "$1" in
        --yes) CONFIRMED=1 ;;
        --ip) [ "$#" -ge 2 ] || { echo "--ip 缺少参数"; exit 1; }; EXPECTED_IP="$2"; shift ;;
        --api) [ "$#" -ge 2 ] || { echo "--api 缺少参数"; exit 1; }; API_URL="$2"; shift ;;
        --token) [ "$#" -ge 2 ] || { echo "--token 缺少参数"; exit 1; }; TOKEN="$2"; shift ;;
        --bootstrap) [ "$#" -ge 2 ] || { echo "--bootstrap 缺少参数"; exit 1; }; BOOTSTRAP="$2"; shift ;;
        --all) PURGE_ALL=1 ;;
        *) echo "未知参数: $1"; exit 1 ;;
    esac
    shift
done

if [ "$(id -u)" -ne 0 ]; then
    echo "❌ 请使用 root 用户执行卸载命令。"
    exit 1
fi

if [ "$CONFIRMED" -ne 1 ]; then
    echo "❌ 为防止误操作，必须显式传入 --yes。"
    exit 1
fi

if [ -z "$EXPECTED_IP" ]; then
    echo "❌ 缺少目标 VPS IP，拒绝卸载。"
    exit 1
fi

if [ "$PURGE_ALL" -eq 1 ]; then
    case "$API_URL" in https://*) ;; *) echo "❌ --all 模式要求 --api 使用 https://"; exit 1 ;; esac
    case "$API_URL" in *'@'*|*'#'*) echo "❌ --api 不能包含用户信息或 fragment"; exit 1 ;; esac
    if [ -z "$TOKEN" ] && [ -n "$BOOTSTRAP" ]; then
        BOOTSTRAP_HEADERS=$(mktemp /tmp/kui-purge-bootstrap.XXXXXX)
        trap 'rm -f "$BOOTSTRAP_HEADERS"' EXIT INT TERM
        curl -fsSL --retry 3 -D "$BOOTSTRAP_HEADERS" -H "Authorization: Bootstrap ${BOOTSTRAP}" "${API_URL}/api/agent_update?ip=${EXPECTED_IP}&component=uninstaller&exchange=1" -o /dev/null
        TOKEN=$(tr -d '\r' < "$BOOTSTRAP_HEADERS" | awk '/^[Xx]-[Aa]gent-[Tt]oken:/ {print $2}' | tail -n 1)
        rm -f "$BOOTSTRAP_HEADERS"
        trap - EXIT INT TERM
    fi
    [ -n "$TOKEN" ] || { echo "❌ --all 模式缺少有效的认证令牌"; exit 1; }
fi

if [ ! -f /opt/kui/config.json ] && [ "$PURGE_ALL" -ne 1 ]; then
    echo "[*] 当前机器未安装 KUI Agent，无需卸载。"
    exit 0
fi

if [ -f /opt/kui/config.json ]; then
    ACTUAL_IP=$(python3 -c 'import json; print(json.load(open("/opt/kui/config.json")).get("ip", ""))' 2>/dev/null || true)
    if [ -z "$ACTUAL_IP" ] || [ "$ACTUAL_IP" != "$EXPECTED_IP" ]; then
        echo "❌ VPS 身份校验失败：面板目标为 $EXPECTED_IP，本机 Agent 记录为 ${ACTUAL_IP:-未知}。"
        echo "   请确认命令是在正确的 VPS 上执行。"
        exit 1
    fi
else
    echo "[*] 未发现 KUI Agent 配置，将继续清理住宅代理组件。"
fi

detect_init_system() {
    if [ -d /run/systemd/system ] && command -v systemctl >/dev/null 2>&1; then
        echo systemd
    elif command -v rc-service >/dev/null 2>&1 && command -v rc-update >/dev/null 2>&1; then
        echo openrc
    else
        echo none
    fi
}

INIT_SYS=$(detect_init_system)
BACKUP_PATH="/root/kui-agent-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
BACKUP_ITEMS=""

for item in \
    opt/kui \
    etc/sing-box \
    usr/bin/sing-box \
    etc/systemd/system/kui-agent.service \
    etc/systemd/system/kui-agent.service.d \
    etc/systemd/system/sing-box.service \
    etc/init.d/kui-agent \
    etc/init.d/sing-box \
    etc/sysctl.d/99-kui-optimize.conf \
    opt/proxy_lite \
    etc/proxy-lite \
    etc/systemd/system/proxy-lite.service \
    etc/init.d/proxy-lite \
    etc/conf.d/proxy-lite \
    etc/sysctl.d/99-proxy-lite.conf; do
    [ ! -e "/$item" ] || BACKUP_ITEMS="$BACKUP_ITEMS $item"
done

if [ -n "$BACKUP_ITEMS" ] && command -v tar >/dev/null 2>&1; then
    umask 077
    # shellcheck disable=SC2086
    tar -C / -czf "$BACKUP_PATH" $BACKUP_ITEMS
    chmod 600 "$BACKUP_PATH"
    echo "[+] 已创建卸载备份：$BACKUP_PATH"
else
    BACKUP_PATH=""
    echo "[*] 未发现 KUI Agent 文件，无需创建备份。"
fi

echo "[*] 停止并禁用 KUI Agent 与 KUI sing-box..."
if [ "$INIT_SYS" = "systemd" ]; then
    systemctl disable --now kui-agent.service >/dev/null 2>&1 || true
    systemctl disable --now sing-box.service >/dev/null 2>&1 || true
    if [ "$PURGE_ALL" -eq 1 ]; then systemctl disable --now proxy-lite.service >/dev/null 2>&1 || true; fi
elif [ "$INIT_SYS" = "openrc" ]; then
    rc-service kui-agent stop >/dev/null 2>&1 || true
    rc-service sing-box stop >/dev/null 2>&1 || true
    rc-update del kui-agent default >/dev/null 2>&1 || true
    rc-update del sing-box default >/dev/null 2>&1 || true
    if [ "$PURGE_ALL" -eq 1 ]; then rc-service proxy-lite stop >/dev/null 2>&1 || true; rc-update del proxy-lite default >/dev/null 2>&1 || true; fi
fi

pkill -f '/opt/kui/run-agent.sh' >/dev/null 2>&1 || true
pkill -f '/opt/kui/agent.py' >/dev/null 2>&1 || true
if [ "$PURGE_ALL" -eq 1 ]; then
    pkill -f 'python3 -u /opt/proxy_lite/lite_manager.py' >/dev/null 2>&1 || true
    pkill -f 'openvpn.*tun_main' >/dev/null 2>&1 || true
    pkill -f 'openvpn.*tun_backup' >/dev/null 2>&1 || true
fi
pkill -x sing-box >/dev/null 2>&1 || true

echo "[*] 删除 KUI Agent、sing-box 及其服务配置..."
REMOVE_SYSTEMD_SINGBOX_UNIT=0
if [ -f /etc/systemd/system/sing-box.service ] \
    && grep -Fq 'Description=Sing-box Proxy Service' /etc/systemd/system/sing-box.service \
    && grep -Fq 'ExecStart=/usr/bin/sing-box run -c /etc/sing-box/config.json' /etc/systemd/system/sing-box.service; then
    REMOVE_SYSTEMD_SINGBOX_UNIT=1
fi
rm -rf /opt/kui
rm -rf /etc/sing-box
rm -rf /etc/systemd/system/kui-agent.service.d
rm -f /usr/bin/sing-box
rm -f /etc/systemd/system/kui-agent.service
[ "$REMOVE_SYSTEMD_SINGBOX_UNIT" -ne 1 ] || rm -f /etc/systemd/system/sing-box.service
rm -f /etc/init.d/kui-agent
rm -f /etc/init.d/sing-box
rm -f /etc/sysctl.d/99-kui-optimize.conf
rm -f /run/kui-agent.pid /run/sing-box.pid
rm -f /var/log/kui-agent.log /var/log/sing-box.log

if [ "$PURGE_ALL" -eq 1 ]; then
    rm -rf /opt/proxy_lite /etc/proxy-lite
    rm -f /etc/systemd/system/proxy-lite.service /etc/init.d/proxy-lite /etc/conf.d/proxy-lite
    rm -f /etc/sysctl.d/99-proxy-lite.conf /var/log/proxy-lite.log
    ip link del tun_main >/dev/null 2>&1 || true
    ip link del tun_backup >/dev/null 2>&1 || true
fi

if [ "$INIT_SYS" = "systemd" ]; then
    systemctl daemon-reload >/dev/null 2>&1 || true
    systemctl reset-failed kui-agent.service sing-box.service proxy-lite.service >/dev/null 2>&1 || true
fi

if [ "$PURGE_ALL" -eq 1 ]; then
    echo "[*] 本机组件清理完成，正在移除面板记录..."
    PAYLOAD=$(printf '{"ip":"%s"}' "$EXPECTED_IP")
    if curl -fsS --connect-timeout 10 --max-time 30 \
        -X POST \
        -H "Authorization: $TOKEN" \
        -H "Content-Type: application/json" \
        --data "$PAYLOAD" \
        "$API_URL/api/vps_purge" >/dev/null; then
        echo "✅ 面板记录已移除。"
    else
        echo "❌ VPS 本地组件已清理，但面板记录移除请求失败。"
        echo "   请修复网络/DNS 后重新执行同一条命令，或在面板手动移除记录。"
        exit 1
    fi
fi

echo ""
echo "✅ KUI Agent 卸载完成。"
if [ "$PURGE_ALL" -eq 1 ]; then
    echo "   - 已移除：KUI Agent、KUI sing-box、proxy-lite、OpenVPN 通道与相关配置"
else
    echo "   - 已移除：kui-agent、KUI sing-box、节点配置与证书"
    echo "   - 已保留：proxy-lite 住宅代理、OpenVPN 通道、面板中的 VPS/节点记录"
fi
if [ -n "$BACKUP_PATH" ]; then
    echo "   - 恢复备份：$BACKUP_PATH"
fi
if [ "$PURGE_ALL" -ne 1 ]; then echo "   如需彻底删除面板记录，请回到 KUI 面板手动移除该 VPS。"; fi
