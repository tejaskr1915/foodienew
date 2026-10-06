import api from './api';

const _isValidId = (id) => {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  return s !== '' && s !== 'undefined' && s !== 'null' && s !== 'NaN';
};

export const qrService = {
  getQRCodes: async () => {
    try {
      const res = await api.get('/tables/');
      const rawList = res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.results || []));
      return rawList.map(t => {
        const tableId = t.id || t.table_id;
        const baseHost = localStorage.getItem('foodie_network_host') || window.location.origin;
        return {
          id: tableId,
          table: tableId,
          code: t.qr_token || `FOODIE-TABLE-${tableId}`,
          qr_token: t.qr_token || `FOODIE-TABLE-${tableId}`,
          qr_data: t.qr_data || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${baseHost}/customer/welcome?table=${tableId}`)}`,
          qr_image_url: t.qr_data || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${baseHost}/customer/welcome?table=${tableId}`)}`,
          is_active: t.qr_is_active === false ? false : true
        };
      });
    } catch (e) {
      console.warn("Failed to fetch tables for QR codes:", e);
      return [];
    }
  },

  getQRCodeById: async (id) => {
    try {
      if (!_isValidId(id)) return null;
      const res = await api.get(`/tables/${id}/`);
      const t = res.data?.data || res.data;
      const tableId = t.id || t.table_id || id;
      const baseHost = localStorage.getItem('foodie_network_host') || window.location.origin;
      return {
        id: tableId,
        table: tableId,
        code: t.qr_token || `FOODIE-TABLE-${tableId}`,
        qr_token: t.qr_token || `FOODIE-TABLE-${tableId}`,
        qr_data: t.qr_data || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${baseHost}/customer/welcome?table=${tableId}`)}`,
        qr_image_url: t.qr_data || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${baseHost}/customer/welcome?table=${tableId}`)}`,
        is_active: t.qr_is_active === false ? false : true
      };
    } catch (e) {
      console.warn(`Failed to fetch QR code for table ${id}:`, e);
      return null;
    }
  },

  getQRCodeByTableId: async (tableId) => {
    return qrService.getQRCodeById(tableId);
  },

  createQRCode: async (data) => {
    const tableId = data.table || data.tableId;
    const payload = {
      qr_token: data.code || data.qr_token || `FOODIE-TABLE-${tableId}`,
      qr_data: data.targetUrl || data.qr_data || data.qr_image_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.targetUrl || '')}`,
      qr_is_active: data.is_active !== undefined ? Boolean(data.is_active) : true
    };
    try {
      if (_isValidId(tableId)) {
        const res = await api.patch(`/tables/${tableId}/`, payload);
        const t = res.data?.data || res.data;
        return {
          id: tableId,
          table: tableId,
          code: t.qr_token || payload.qr_token,
          qr_token: t.qr_token || payload.qr_token,
          qr_data: t.qr_data || payload.qr_data,
          qr_image_url: t.qr_data || payload.qr_data,
          is_active: t.qr_is_active !== undefined ? Boolean(t.qr_is_active) : payload.qr_is_active
        };
      }
    } catch (e) {
      console.warn("Failed to create/update QR code on table:", e);
    }
    return {
      id: tableId,
      table: tableId,
      code: payload.qr_token,
      qr_token: payload.qr_token,
      qr_data: payload.qr_data,
      qr_image_url: payload.qr_data,
      is_active: payload.qr_is_active
    };
  },

  updateQRCode: async (id, data) => {
    const tableId = id;
    const payload = {};
    if (data.code !== undefined || data.qr_token !== undefined) payload.qr_token = data.code || data.qr_token;
    if (data.qr_data !== undefined || data.targetUrl !== undefined || data.qr_image_url !== undefined) {
      payload.qr_data = data.qr_data || data.targetUrl || data.qr_image_url;
    }
    if (data.is_active !== undefined || data.qr_is_active !== undefined) {
      payload.qr_is_active = data.qr_is_active !== undefined ? Boolean(data.qr_is_active) : Boolean(data.is_active);
    }

    try {
      if (!_isValidId(tableId)) return { id: tableId, table: tableId, ...data };
      const res = await api.patch(`/tables/${tableId}/`, payload);
      const t = res.data?.data || res.data;
      return {
        id: tableId,
        table: tableId,
        code: t.qr_token || payload.qr_token,
        qr_token: t.qr_token || payload.qr_token,
        qr_data: t.qr_data || payload.qr_data,
        qr_image_url: t.qr_data || payload.qr_data,
        is_active: t.qr_is_active !== undefined ? Boolean(t.qr_is_active) : true
      };
    } catch (e) {
      console.warn("Failed to patch table QR fields:", e);
      return { id: tableId, table: tableId, ...data };
    }
  },

  toggleQRCodeStatus: async (id, currentStatus) => {
    return qrService.updateQRCode(id, { is_active: !currentStatus });
  },

  deleteQRCode: async (id) => {
    try {
      if (_isValidId(id)) {
        await api.patch(`/tables/${id}/`, {
          qr_token: null,
          qr_data: null,
          qr_is_active: false
        });
      }
    } catch (e) {
      console.warn("Failed to delete table QR fields:", e);
    }
    return true;
  }
};

export default qrService;
