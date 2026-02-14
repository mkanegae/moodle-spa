import React, { useState, useRef } from 'react';
import { DataType } from '../../types/admin';

interface CsvUploaderProps {
  dataType: DataType;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({
  dataType,
  onUpload,
  isUploading
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        alert('CSVファイルを選択してください');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file);
      } else {
        alert('CSVファイルを選択してください');
      }
    }
  };

  const handleUploadClick = async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
        CSVファイルをアップロード
      </h3>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#1976d2' : '#bdbdbd'}`,
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          backgroundColor: dragActive ? '#e3f2fd' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>

        {selectedFile ? (
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#212121', marginBottom: '8px' }}>
              選択されたファイル
            </div>
            <div style={{ fontSize: '14px', color: '#757575', marginBottom: '4px' }}>
              {selectedFile.name}
            </div>
            <div style={{ fontSize: '12px', color: '#9e9e9e' }}>
              {(selectedFile.size / 1024).toFixed(2)} KB
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '16px', color: '#212121', marginBottom: '8px' }}>
              CSVファイルをドラッグ&ドロップ
            </div>
            <div style={{ fontSize: '14px', color: '#757575' }}>
              または クリックしてファイルを選択
            </div>
          </div>
        )}
      </div>

      {selectedFile && (
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            style={{
              padding: '12px 24px',
              backgroundColor: isUploading ? '#bdbdbd' : '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              if (!isUploading) {
                e.currentTarget.style.backgroundColor = '#1565c0';
              }
            }}
            onMouseOut={(e) => {
              if (!isUploading) {
                e.currentTarget.style.backgroundColor = '#1976d2';
              }
            }}
          >
            {isUploading ? 'アップロード中...' : 'アップロード'}
          </button>

          <button
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            disabled={isUploading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#fff',
              color: '#757575',
              border: '1px solid #bdbdbd',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isUploading ? 'not-allowed' : 'pointer'
            }}
          >
            キャンセル
          </button>
        </div>
      )}

      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#fff3e0',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#e65100'
      }}>
        <strong>注意:</strong> CSVファイルのフォーマットは、選択したデータタイプ（{dataType}）に対応している必要があります。
      </div>
    </div>
  );
};
