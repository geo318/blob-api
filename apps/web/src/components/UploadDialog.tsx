'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface UploadDialogProps {
  currentPath: string;
  onClose: () => void;
  onUploaded: () => void;
}

export function UploadDialog({ currentPath, onClose, onUploaded }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path || `${currentPath === '/' ? '' : currentPath}/${file.name}`);

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/fs/file`, {
        method: 'PUT',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      onUploaded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div className="card" style={{ minWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: '20px' }}>Upload File</h2>
        <form onSubmit={handleSubmit}>
          <label className="label">File</label>
          <input
            type="file"
            className="input"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) {
                setFile(selected);
                setPath(`${currentPath === '/' ? '' : currentPath}/${selected.name}`);
              }
            }}
            required
          />
          <label className="label">Path</label>
          <input
            type="text"
            className="input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="File path"
            required
          />
          {error && <div className="error">{error}</div>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="button" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload'}
            </button>
            <button type="button" className="button" onClick={onClose} style={{ backgroundColor: '#666' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
