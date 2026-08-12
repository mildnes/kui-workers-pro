export function applyEgressRealtimeResult(server, result) {
  if (!server || result?.component !== 'egress') return false;
  const revision = Number(result.revision);
  const currentRevision = Number(server.egress_revision || 0);
  if (!Number.isSafeInteger(revision) || revision < 0) return false;
  const exactRevision = revision === currentRevision;
  const pendingTarget = ['pending', 'preparing'].includes(server.egress_status)
    && revision >= currentRevision
    && result.desired_mode === server.egress_mode;
  if (!exactRevision && !pendingTarget) return false;

  server.egress_revision = Math.max(currentRevision, revision);
  server.egress_status = result.status === 'preparing' ? 'preparing' : (result.success ? 'applied' : 'failed');
  server.egress_applied_mode = result.applied_mode;
  server.egress_error = result.status === 'preparing' ? (result.message || '') : (result.error || '');
  if (server.egress_status === 'applied') {
    server.egress_applied_revision = revision;
    if (result.egress_ip) server.egress_ip = result.egress_ip;
  }
  return true;
}
