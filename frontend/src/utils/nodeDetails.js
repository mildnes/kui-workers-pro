const text = value => value === null || value === undefined ? '' : String(value).trim();

export function buildNodeDetailRows(node = {}) {
  const protocol = text(node.protocol);
  const rows = [];
  const add = (label, value) => { const normalized = text(value); if (normalized) rows.push({ label, value: normalized }); };

  add(protocol === 'VLESS-Argo' ? '本地监听端口' : '监听端口', node.port);

  if (['XTLS-Reality', 'Reality', 'H2-Reality', 'gRPC-Reality'].includes(protocol)) {
    add('UUID', node.uuid);
    add('SNI / 伪装域名', node.sni);
    add('传输方式', protocol === 'H2-Reality' ? 'HTTP/2 + Reality' : protocol === 'gRPC-Reality' ? 'gRPC + Reality' : 'TCP + XTLS Vision');
    add('Reality 公钥', node.public_key);
    add('Reality 短 ID', node.short_id);
    add('Reality 私钥', node.private_key);
  } else if (protocol === 'Hysteria2') {
    add('密码', node.uuid || node.private_key);
    add('SNI / 域名', node.sni);
    add('传输方式', 'UDP / QUIC · ALPN h3');
  } else if (protocol === 'TUIC') {
    add('UUID', node.uuid);
    add('密码', node.private_key);
    add('传输方式', 'UDP / QUIC · ALPN h3');
  } else if (protocol === 'Shadowsocks2022') {
    add('加密方式', node.uuid);
    add('密码', node.private_key);
    add('传输网络', node.network || 'tcp');
  } else if (protocol === 'Trojan') {
    add('密码', node.private_key);
    add('SNI / 域名', node.sni);
    add('传输方式', 'TCP + TLS');
  } else if (protocol === 'AnyTLS') {
    add('密码', node.private_key);
    add('SNI / 域名', node.sni);
    add('传输方式', 'TCP + TLS');
  } else if (protocol === 'Naive') {
    add('用户名', node.uuid);
    add('密码', node.private_key);
    add('SNI / 域名', node.sni);
    add('传输方式', 'HTTPS');
  } else if (protocol === 'Socks5') {
    add('代理用户名', node.uuid);
    add('代理密码', node.private_key);
    add('传输网络', node.network || 'tcp');
  } else if (protocol === 'VLESS-Argo') {
    add('UUID', node.uuid);
    add('公网域名', node.sni);
    add('公网端口', '443');
    add('传输方式', 'WebSocket + TLS');
  } else if (protocol === 'dokodemo-door') {
    add('转发类型', node.relay_type === 'internal' ? '内部节点' : '外部地址');
    if (node.relay_type === 'internal') add('目标节点 ID', node.target_id);
    else add('转发目标', node.target_ip && node.target_port ? `${node.target_ip}:${node.target_port}` : node.target_ip || node.target_port);
    add('传输网络', node.network || 'tcp');
  } else {
    add('UUID', node.uuid);
    add('SNI / 域名', node.sni);
    add('传输网络', node.network || 'tcp');
    add('密码 / 密钥', node.private_key);
  }

  add('节点 ID', node.id);
  return rows;
}
