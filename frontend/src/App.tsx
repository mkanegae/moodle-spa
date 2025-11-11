import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import ErrorBoundary from './components/ErrorBoundary';
import AppRoutes from './routes';
import { useAuthStore } from './store/authStore';
import { useCategoryStore } from './store/categoryStore';
import { theme } from './theme';

// Markdown rendering styles
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

const App: React.FC = () => {
  const { token, isAuthenticated } = useAuthStore();
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  useEffect(() => {
    // zustand persistが自動的にtokenを復元するので、それが完了したらカテゴリを取得
    if (token && isAuthenticated) {
      fetchCategories();
    }
  }, [token, isAuthenticated, fetchCategories]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <BrowserRouter>
          <AnimatePresence mode="wait">
            <AppRoutes />
          </AnimatePresence>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;
