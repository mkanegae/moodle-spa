import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import { moodleAPI } from '../services/api';
import { LoginCredentials } from '../types/auth';
import { useAuthStore } from '../store/authStore';
import { useCategoryStore } from '../store/categoryStore';

interface LoginPageProps {
  onLoginSuccess?: (token: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
    service: 'moodle_mobile_app'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await moodleAPI.login(credentials);
      console.log('Login API response:', response);

      if (response.token) {
        login(response.token);
        localStorage.setItem('moodle_token', response.token);
        await fetchCategories();
        if (onLoginSuccess) {
          onLoginSuccess(response.token);
        }
        navigate('/dashboard');
      } else {
        setError('Invalid credentials or missing token in response');
      }
    } catch (err: any) {
      console.error('Login catch error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed';
      setError(`Login failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Typography component="h1" variant="h4" gutterBottom>
              Moodle Login
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Sign in to access your courses
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={credentials.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={credentials.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default LoginPage;
