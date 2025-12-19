'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { FsNode } from './FileBrowser';

interface FilePreviewProps {
  node: FsNode | null;
  onClose: () => void;
}

export function FilePreview({ node, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!node || node.type !== 'file') return;

    setLoading(true);
    setError('');

    const isImage = node.mimeType?.startsWith('image/');
    const isPdf = node.mimeType === 'application/pdf';
    const isText = node.mimeType?.startsWith('text/') || !node.mimeType;

    if (isImage || isPdf) {
      // Use proxy route for images and PDFs
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        setContent(`/api/file-proxy?path=${encodeURIComponent(node.path)}&token=${encodeURIComponent(token)}`);
      } else {
        setError('Authentication required');
      }
      setLoading(false);
    } else if (isText) {
      // Fetch as text
      apiClient
        .fetchBlob(`/fs/file?path=${encodeURIComponent(node.path)}`)
        .then((blob) => blob.text())
        .then((text) => {
          setContent(text);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load file');
          setLoading(false);
        });
    } else {
      setError('Preview not available for this file type');
      setLoading(false);
    }
  }, [node]);

  if (!node) return null;

  const isImage = node.mimeType?.startsWith('image/');
  const isPdf = node.mimeType === 'application/pdf';
  const isText = node.mimeType?.startsWith('text/') || !node.mimeType;

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
      <div
        className="card"
        style={{ maxWidth: '90%', maxHeight: '90%', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2>{node.name}</h2>
          <button onClick={onClose} className="button" style={{ backgroundColor: '#d32f2f' }}>
            Close
          </button>
        </div>

        {loading && <div>Loading...</div>}
        {error && <div className="error">{error}</div>}

        {!loading && !error && (
          <>
            {isImage && (
              <img src={content} alt={node.name} style={{ maxWidth: '100%', height: 'auto' }} />
            )}
            {isPdf && (
              <iframe src={content} width="100%" height="600px" style={{ border: 'none' }} />
            )}
            {isText && (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {content}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}

