import axios from 'axios';
import { auth } from './firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create axios instance
export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Firebase JWT on every request
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Silent fail — unauthenticated requests will get 401
  }
  return config;
});

// Response interceptor: normalize errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  me: () => api.get('/auth/me'),
  register: (data: { name: string; publicKey?: string }) =>
    api.post('/auth/register', data),
  updatePublicKey: (publicKey: string) =>
    api.post('/auth/public-key', { publicKey }),
  getUserByEmail: (email: string) => api.get(`/auth/user/${encodeURIComponent(email)}`),
};

// ─── Files API ────────────────────────────────────────────────────────────────
export const filesApi = {
  list: (params?: {
    folderId?: string;
    search?: string;
    sort?: string;
    order?: string;
  }) => api.get('/files', { params }),
  upload: (data: {
    encryptedFile: Blob;
    mimeType: string;
    filename: string;
    size: number;
    encryptionType: string;
    encryptedKey: string;
    iv: string;
    folderId?: string;
    layerCount?: number;
    watermarkEnabled?: boolean;
    downloadDisabled?: boolean;
    // Watermark config
    watermarkFields?: string;
    watermarkText?: string;
    watermarkOpacity?: number;
    watermarkFontSize?: string;
    watermarkRotation?: number;
    watermarkPlacement?: string;
    watermarkColor?: string;
    layers?: Array<{ algorithm: string; order: number; iv: string }>;
  }, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('encryptedFile', data.encryptedFile);
    formData.append('mimeType', data.mimeType);
    formData.append('filename', data.filename);
    formData.append('size', data.size.toString());
    formData.append('encryptionType', data.encryptionType);
    formData.append('encryptedKey', data.encryptedKey);
    formData.append('iv', data.iv);
    if (data.folderId) formData.append('folderId', data.folderId);
    if (data.layerCount !== undefined) formData.append('layerCount', data.layerCount.toString());
    if (data.watermarkEnabled !== undefined) formData.append('watermarkEnabled', data.watermarkEnabled.toString());
    if (data.downloadDisabled !== undefined) formData.append('downloadDisabled', data.downloadDisabled.toString());
    // Watermark config
    if (data.watermarkFields !== undefined) formData.append('watermarkFields', data.watermarkFields);
    if (data.watermarkText !== undefined) formData.append('watermarkText', data.watermarkText);
    if (data.watermarkOpacity !== undefined) formData.append('watermarkOpacity', data.watermarkOpacity.toString());
    if (data.watermarkFontSize !== undefined) formData.append('watermarkFontSize', data.watermarkFontSize);
    if (data.watermarkRotation !== undefined) formData.append('watermarkRotation', data.watermarkRotation.toString());
    if (data.watermarkPlacement !== undefined) formData.append('watermarkPlacement', data.watermarkPlacement);
    if (data.watermarkColor !== undefined) formData.append('watermarkColor', data.watermarkColor);
    if (data.layers) formData.append('layers', JSON.stringify(data.layers));

    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    });
  },
  get: (id: string) => api.get(`/files/${id}`),
  update: (
    id: string,
    data: {
      filename?: string;
      folderId?: string | null;
      watermarkEnabled?: boolean;
      downloadDisabled?: boolean;
      // Watermark config
      watermarkFields?: string;
      watermarkText?: string | null;
      watermarkOpacity?: number;
      watermarkFontSize?: string;
      watermarkRotation?: number;
      watermarkPlacement?: string;
      watermarkColor?: string;
    }
  ) => api.patch(`/files/${id}`, data),
  delete: (id: string, permanent?: boolean) =>
    api.delete(`/files/${id}`, { params: { permanent } }),
  trash: () => api.get('/files/trash/list'),
};

// ─── Share API ────────────────────────────────────────────────────────────────
export const shareApi = {
  create: (data: {
    fileId: string;
    recipientEmail?: string;
    encryptedKeyForRecipient?: string;
    canView?: boolean;
    canDownload?: boolean;
    canEdit?: boolean;
    expiresAt?: string;
    maxViews?: number;
    requireOTP?: boolean;
    ipRestriction?: string;
  }) => api.post('/share', data),
  resolve: (token: string) => api.get(`/share/${token}`),
  list: () => api.get('/share'),
  revoke: (id: string) => api.delete(`/share/${id}`),
  sharedWithMe: () => api.get('/share/with/me'),
};

// ─── Folders API ──────────────────────────────────────────────────────────────
export const foldersApi = {
  list: (parentId?: string) => api.get('/folders', { params: { parentId } }),
  create: (data: { name: string; parentId?: string }) => api.post('/folders', data),
  update: (id: string, name: string) => api.patch(`/folders/${id}`, { name }),
  delete: (id: string) => api.delete(`/folders/${id}`),
};

// ─── Activity API ─────────────────────────────────────────────────────────────
export const activityApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    fileId?: string;
    action?: string;
  }) => api.get('/activity', { params }),
};

// ─── Notifications API ────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => api.get('/notifications'),
  readAll: () => api.patch('/notifications/read-all'),
  read: (id: string) => api.patch(`/notifications/${id}/read`),
};
