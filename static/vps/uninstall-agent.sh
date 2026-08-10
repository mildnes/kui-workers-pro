#!/bin/sh

set -eu

CONFIRMED=0
EXPECTED_IP=""
while [ "$#" -gt 0 ]; do
    case "$1" in
        --yes) CONFIRMED=1 ;;
        --ip) [ "$#" -ge 2 ] || { echo "--ip 缺少参数"; exit 1; }; EXPECTED_IP="$2"; shift ;;
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

if [ ! -f /opt/kui/config.json ]; then
    echo "[*] 当前机器未安装 KUI Agent，无需卸载。"
    exit 0
fi

ACTUAL_IP=$(python3 -c 'import json; print(json.load(open("/opt/kui/config.json")).get("ip", ""))' 2>/dev/null || true)
if [ -z "$ACTUAL_IP" ] || [ "$ACTUAL_IP" != "$EXPECTED_IP" ]; then
    echo "❌ VPS 身份校验失败：面板目标为 $EXPECTED_IP，本机 Agent 记录为 ${ACTUAL_IP:-未知}。"
    echo "   请确认命令是在正确的 VPS 上执行。"
    exit 1
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
    etc/sysctl.d/99-kui-optimize.conf; do
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
elif [ "$INIT_SYS" = "openrc" ]; then
    rc-service kui-agent stop >/dev/null 2>&1 || true
    rc-service sing-box stop >/dev/null 2>&1 || true
    rc-update del kui-agent default >/dev/null 2>&1 || true
    rc-update del sing-box default >/dev/null 2>&1 || true
fi

pkill -f '/opt/kui/run-agent.sh' >/dev/null 2>&1 || true
pkill -f '/opt/kui/agent.py' >/dev/null 2>&1 || true
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

if [ "$INIT_SYS" = "systemd" ]; then
    systemctl daemon-reload >/dev/null 2>&1 || true
    systemctl reset-failed kui-agent.service sing-box.service >/dev/null 2>&1 || true
fi

echo ""
echo "✅ KUI Agent 卸载完成。"
echo "   - 已移除：kui-agent、KUI sing-box、节点配置与证书"
echo "   - 已保留：proxy-lite 住宅代理、OpenVPN 通道、面板中的 VPS/节点记录"
if [ -n "$BACKUP_PATH" ]; then
    echo "   - 恢复备份：$BACKUP_PATH"
fi
echo "   如需彻底删除面板记录，请回到 KUI 面板手动移除该 VPS。"
