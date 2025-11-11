import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  TextField,
  IconButton,
} from '@mui/material';
import { Close, SmartToy, Source } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { moodleAPI } from '../services/api';

interface AISummaryDialogProps {
  open: boolean;
  onClose: () => void;
  courseId: number;
  moduleName?: string;
}

interface SummaryResult {
  summary: string;
  sources: Array<{
    chunk_index: number;
    module_name: string;
    filename: string;
    section_name: string;
    similarity: number;
  }>;
  mode: string;
}

const AISummaryDialog: React.FC<AISummaryDialogProps> = ({
  open,
  onClose,
  courseId,
  moduleName,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'summary' | 'qa'>('summary');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const result = await moodleAPI.summarizeContent(
        courseId,
        moduleName,
        mode === 'qa' ? query : undefined
      );

      setSummary(result);
    } catch (err: any) {
      setError(err.message || 'AI要約の生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setSummary(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToy color="primary" />
          <Typography variant="h6" fontWeight="bold">
            AI要約 - {moduleName || 'コース全体'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* モード選択 */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
          <Button
            variant={mode === 'summary' ? 'contained' : 'outlined'}
            onClick={() => setMode('summary')}
            size="small"
          >
            要約モード
          </Button>
          <Button
            variant={mode === 'qa' ? 'contained' : 'outlined'}
            onClick={() => setMode('qa')}
            size="small"
          >
            Q&Aモード
          </Button>
        </Box>

        {/* Q&Aモード時の質問入力 */}
        {mode === 'qa' && (
          <TextField
            fullWidth
            label="質問を入力してください"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例：この教材の主なトピックは何ですか？"
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
        )}

        {/* 生成ボタン */}
        {!summary && !loading && (
          <Button
            variant="contained"
            fullWidth
            onClick={handleGenerate}
            disabled={mode === 'qa' && !query.trim()}
            sx={{ mb: 2 }}
          >
            {mode === 'summary' ? '要約を生成' : '質問に回答'}
          </Button>
        )}

        {/* ローディング */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>AI が {mode === 'summary' ? '要約' : '回答'}を生成中...</Typography>
          </Box>
        )}

        {/* エラー */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 要約結果 */}
        {summary && (
          <Box>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={summary.mode === 'summary' ? '要約' : 'Q&A'}
                color="primary"
                size="small"
                sx={{ mb: 1 }}
              />
            </Box>

            {/* 生成されたテキスト */}
            <Box
              sx={{
                bgcolor: '#f5f5f5',
                p: 3,
                borderRadius: 2,
                mb: 3,
                border: '1px solid #e0e0e0',
              }}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <Typography paragraph>{children}</Typography>,
                  ul: ({ children }) => (
                    <Box component="ul" sx={{ pl: 2, mt: 1, mb: 1 }}>
                      {children}
                    </Box>
                  ),
                  li: ({ children }) => (
                    <Box component="li" sx={{ mb: 0.5 }}>
                      <Typography>{children}</Typography>
                    </Box>
                  ),
                }}
              >
                {summary.summary}
              </ReactMarkdown>
            </Box>

            {/* 参照元情報 */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Source fontSize="small" />
                <Typography variant="subtitle2" fontWeight="bold">
                  参照元
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {summary.sources.map((source, index) => (
                  <Box
                    key={index}
                    sx={{
                      bgcolor: 'white',
                      p: 1.5,
                      borderRadius: 1,
                      border: '1px solid #e0e0e0',
                      fontSize: '0.875rem',
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      {source.module_name}
                      {source.filename && ` - ${source.filename}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      セクション: {source.section_name} | 類似度: {(source.similarity * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* 再生成ボタン */}
            <Button
              variant="outlined"
              fullWidth
              onClick={handleGenerate}
              sx={{ mt: 2 }}
            >
              再生成
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AISummaryDialog;
