import React, { useState } from 'react';
import { DataType, UploadHistory as UploadHistoryType, UploadResult as UploadResultType } from '../types/admin';
import { DataTypeSelector } from './admin/DataTypeSelector';
import { CsvUploader } from './admin/CsvUploader';
import { UploadResult } from './admin/UploadResult';
import { UploadHistory } from './admin/UploadHistory';

export const AdminPage: React.FC = () => {
  const [selectedDataType, setSelectedDataType] = useState<DataType>('users');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResultType | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryType[]>([]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadResult(null);

    try {
      // CSVファイルを読み込む
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        throw new Error('CSVファイルが空です');
      }

      // ヘッダー行を取得
      const headers = lines[0].split(',').map(h => h.trim());

      // データ行をパース
      const records = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const record: Record<string, string> = {};

        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });

        records.push(record);
      }

      console.log(`[AdminPage] Parsed ${records.length} records from CSV`);

      // BFF経由でFastAPIにリクエスト
      const response = await fetch('/api/webcoach/updatedb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          data_type: selectedDataType,
          records: records
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || 'アップロードに失敗しました');
      }

      const result = await response.json();

      const uploadResult: UploadResultType = {
        success: result.success,
        recordsProcessed: result.recordsProcessed,
        recordsFailed: result.recordsFailed,
        message: result.message,
        errors: result.errors?.map((e: any) => ({
          row: e.row,
          message: e.message
        }))
      };

      setUploadResult(uploadResult);

      // 履歴に追加
      const newHistoryItem: UploadHistoryType = {
        id: Date.now().toString(),
        dataType: selectedDataType,
        filename: file.name,
        uploadedAt: new Date(),
        status: uploadResult.success ? 'success' : 'failed',
        recordsProcessed: uploadResult.recordsProcessed,
        recordsFailed: uploadResult.recordsFailed,
        errorMessage: uploadResult.success ? undefined : uploadResult.message
      };

      setUploadHistory(prev => [newHistoryItem, ...prev]);

    } catch (error) {
      console.error('[AdminPage] Upload error:', error);
      const errorResult: UploadResultType = {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 0,
        message: error instanceof Error ? error.message : 'アップロード中にエラーが発生しました'
      };
      setUploadResult(errorResult);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: '#fafafa',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#212121',
            marginBottom: '8px'
          }}>
            管理画面
          </h1>
          <p style={{ fontSize: '14px', color: '#757575' }}>
            CSVファイルを使用してデータの一括登録・更新を行います
          </p>
        </div>

        <DataTypeSelector
          selectedType={selectedDataType}
          onTypeChange={setSelectedDataType}
        />

        <UploadResult
          result={uploadResult}
          onClose={() => setUploadResult(null)}
        />

        <CsvUploader
          dataType={selectedDataType}
          onUpload={handleUpload}
          isUploading={isUploading}
        />

        <UploadHistory history={uploadHistory} />
      </div>
    </div>
  );
};
