/**
 * MindFlow - Document (Storage) Service
 * Per API_CONTRACT.md Section 8.10 (Storage Module)
 *
 * Wraps the gateway `/documents` proxy to the storage-service. Handles the
 * actual file bytes (multipart upload + authenticated content download), which
 * the per-module services (e.g. expense receipts) reference by fileId.
 */

import { apiClient, get, post, del } from '@/services/api/client';

const DOCUMENTS_BASE = '/documents';

export interface UploadedFile {
  id: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
  downloadUrl?: string;
}

export interface FileMetadataItem {
  id: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  createdAt: string;
  createdBy: string;
}

export interface FileListResult {
  items: FileMetadataItem[];
  pagination?: unknown;
}

export interface UploadOptions {
  module: string;
  entityType?: string;
  entityId?: string;
  description?: string;
}

export const documentService = {
  /** Upload raw file bytes; returns the created file (use `.id` as the fileId). */
  async upload(file: File, opts: UploadOptions): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', opts.module);
    if (opts.entityType) formData.append('entity_type', opts.entityType);
    if (opts.entityId) formData.append('entity_id', opts.entityId);
    if (opts.description) formData.append('description', opts.description);
    return post<UploadedFile>(DOCUMENTS_BASE, formData);
  },

  /** Get metadata (filename, size, etc.) for a single file. */
  async getById(fileId: string): Promise<FileMetadataItem> {
    return get<FileMetadataItem>(`${DOCUMENTS_BASE}/${fileId}`);
  },

  /** List files for a given module + entity (e.g. all receipts for an expense). */
  async listByEntity(module: string, entityId: string): Promise<FileListResult> {
    return get<FileListResult>(DOCUMENTS_BASE, { module, entity_id: entityId, pageSize: 100 });
  },

  /** Fetch file bytes as a Blob via the authenticated streaming endpoint. */
  async getBlob(fileId: string): Promise<Blob> {
    const response = await apiClient.get(`${DOCUMENTS_BASE}/${fileId}/content`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  /** Soft-delete a file. */
  async delete(fileId: string): Promise<void> {
    return del<void>(`${DOCUMENTS_BASE}/${fileId}`);
  },
};

export default documentService;
