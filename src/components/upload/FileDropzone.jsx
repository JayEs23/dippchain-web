// File Dropzone Component
import { useState, useCallback } from 'react';
import { Upload, X, File, Image, Video, Music, FileText } from 'lucide-react';
import { formatFileSize, getAssetTypeFromMime, validateFileType, validateFileSize } from '@/lib/utils';
import { SUPPORTED_FILE_TYPES } from '@/lib/constants';

const FileTypeIcon = ({ type, size = 24 }) => {
  const props = { size, strokeWidth: 1.5 };
  switch (type) {
    case 'IMAGE': return <Image {...props} />;
    case 'VIDEO': return <Video {...props} />;
    case 'AUDIO': return <Music {...props} />;
    case 'TEXT':
    case 'DOCUMENT': return <FileText {...props} />;
    default: return <File {...props} />;
  }
};

export default function FileDropzone({ onFileSelect, selectedFile, onClear, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  }, [disabled]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) validateAndSelect(file);
    e.target.value = ''; // Reset input
  }, []);

  const validateAndSelect = (file) => {
    setError('');
    
    // Validate file type
    const typeResult = validateFileType(file);
    if (!typeResult.valid) {
      setError(typeResult.error);
      return;
    }

    // Validate file size
    const sizeResult = validateFileSize(file, typeResult.assetType);
    if (!sizeResult.valid) {
      setError(sizeResult.error);
      return;
    }

    onFileSelect(file, typeResult.assetType);
  };

  const acceptedTypes = Object.values(SUPPORTED_FILE_TYPES).flat().join(',');
  const assetType = selectedFile ? getAssetTypeFromMime(selectedFile.type) : null;

  return (
    <div style={{ marginBottom: '24px' }}>
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? '#0a0a0a' : '#d4d4d4'}`,
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: isDragging ? '#fafafa' : 'white',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: disabled ? 0.5 : 1,
          }}
          onClick={() => !disabled && document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept={acceptedTypes}
            onChange={handleFileInput}
            style={{ display: 'none' }}
            disabled={disabled}
          />
          
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Upload size={28} color="#737373" />
          </div>
          
          <p style={{ fontSize: '16px', fontWeight: '500', color: '#0a0a0a', marginBottom: '8px' }}>
            Drop your file here or click to browse
          </p>
          <p style={{ fontSize: '14px', color: '#737373', marginBottom: '16px' }}>
            Supports images, videos, audio, and documents
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Image', 'Video', 'Audio', 'Document'].map((type) => (
              <span key={type} style={{
                fontSize: '12px',
                padding: '4px 10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                color: '#525252',
              }}>
                {type}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          border: '1px solid #e5e5e5',
          borderRadius: '12px',
          padding: '20px',
          backgroundColor: '#fafafa',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '8px',
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileTypeIcon type={assetType} size={28} />
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#0a0a0a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: '13px', color: '#737373', marginTop: '4px' }}>
                {assetType} · {formatFileSize(selectedFile.size)}
              </p>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #e5e5e5',
                backgroundColor: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} color="#737373" />
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '8px' }}>
          {error}
        </p>
      )}
    </div>
  );
}

