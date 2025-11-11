import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import {
  Logout,
  Home,
  School,
  Work,
} from '@mui/icons-material';

interface WebCoachHeaderProps {
  onLogout?: () => void;
  onNavigateToCareerPath?: () => void;
  onNavigateToSkill?: () => void;
  showButtons?: boolean;
}

const WebCoachHeader: React.FC<WebCoachHeaderProps> = ({
  onLogout,
  onNavigateToCareerPath,
  onNavigateToSkill,
  showButtons = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/home' || location.pathname === '/';
  const isMyLearningPage = location.pathname === '/my-learning';

  return (
    <AppBar position="static" sx={{ bgcolor: '#C62828' }}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, fontWeight: 'bold', cursor: 'pointer' }}
          onClick={() => navigate('/home')}
        >
          WEBCOACH
        </Typography>
        {showButtons && (
          <>
            <Button
              color="inherit"
              startIcon={<Home />}
              sx={{
                mr: 2,
                bgcolor: isHomePage ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              }}
              onClick={() => navigate('/home')}
            >
              ホーム
            </Button>
            <Button
              color="inherit"
              startIcon={<School />}
              sx={{
                mr: 2,
                bgcolor: isMyLearningPage ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              }}
              onClick={() => navigate('/my-learning')}
            >
              マイラーニング
            </Button>
            <Button color="inherit" startIcon={<Work />} sx={{ mr: 2 }}>
              キャリアパス
            </Button>
          </>
        )}
        {onLogout && (
          <IconButton color="inherit" onClick={onLogout}>
            <Logout />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default WebCoachHeader;
