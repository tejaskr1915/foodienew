import api from './api';

let _auditErrorCooldownUntil = 0;
let _auditConsecutiveErrors = 0;
const AUDIT_COOLDOWN_MS = 15000;

const _isValidId = (id) => {
  if (id === undefined || id === null) return false;
  const s = String(id);
  return s !== '' && s !== 'undefined' && s !== 'null' && s !== 'NaN';
};

export const auditLogService = {
  getAuditLogs: async () => {
    const now = Date.now();
    if (now < _auditErrorCooldownUntil) return [];
    try {
      const res = await api.get('/admin/audit-logs/');
      _auditConsecutiveErrors = 0;
      return res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404 || status === 401 || status === 403) {
        _auditConsecutiveErrors += 1;
        const backoff = Math.min(AUDIT_COOLDOWN_MS * Math.pow(2, _auditConsecutiveErrors - 1), 120000);
        _auditErrorCooldownUntil = Date.now() + backoff;
      }
      return [];
    }
  },

  createAuditLog: async (action, entity, entityId, details, userId = 1) => {
    const now = Date.now();
    if (now < _auditErrorCooldownUntil) return null;
    if (!_isValidId(entityId)) return null;
    try {
      const res = await api.post('/admin/audit-logs/', {
        action,
        entity,
        entity_id: entityId,
        details: typeof details === 'string' ? details : (details ? JSON.stringify(details) : ''),
        user: userId
      });
      _auditConsecutiveErrors = 0;
      return res.data?.data || res.data;
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404 || status === 401 || status === 403 || status === 400) {
        _auditConsecutiveErrors += 1;
        const backoff = Math.min(AUDIT_COOLDOWN_MS * Math.pow(2, _auditConsecutiveErrors - 1), 120000);
        _auditErrorCooldownUntil = Date.now() + backoff;
      }
      return null;
    }
  }
};

export default auditLogService;
