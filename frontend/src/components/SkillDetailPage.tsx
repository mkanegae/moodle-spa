import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  Checkbox,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack,
  FiberManualRecord,
  Menu as MenuIcon,
  CheckBox,
  CheckBoxOutlineBlank,
  Description,
  BrushOutlined,
} from '@mui/icons-material';

interface SkillDetailPageProps {
  skillId: number;
  onBack: () => void;
}

const SkillDetailPage: React.FC<SkillDetailPageProps> = ({ skillId, onBack }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // スキル別データ（WEBデザインの例）
  const skillData = {
    title: 'WEBデザイン',
    subtitle: 'Web Design',
    color: '#E91E63',
    tabs: ['概要', '基本', '課程'],
    sections: [
      {
        id: 1,
        title: 'イントロダクション',
        subtitle: 'Introduction',
        icon: <Description sx={{ color: '#E91E63' }} />,
        lessons: [
          { id: 1, title: 'デザインの考え方と目標', completed: false, type: 'video' as const },
          { id: 2, title: 'デザインの考え方と比較観察', completed: false, type: 'video' as const },
          { id: 3, title: 'WEBデザイン・基礎知識', completed: false, type: 'text' as const },
          { id: 4, title: 'WEBデザイン・レイアウトのダウグラフ通', completed: false, type: 'video' as const },
          { id: 5, title: 'WEBデザイン・ビジュアル編', completed: false, type: 'video' as const },
          { id: 6, title: 'WEBデザイン・視線の動きを意識した文法', completed: false, type: 'text' as const },
        ],
      },
      {
        id: 2,
        title: 'Figma',
        subtitle: 'Figma',
        icon: <BrushOutlined sx={{ color: '#E91E63' }} />,
        lessons: [
          { id: 7, title: 'Figma｜はじめに', completed: false, type: 'video' as const },
          { id: 8, title: 'Figma｜第1章 環境設定をして作業を開始しよう', completed: false, type: 'video' as const },
          { id: 9, title: 'Figma｜第2章 画像編集をしたり画像ファイルを書きだす', completed: false, type: 'video' as const },
          { id: 10, title: 'Figma｜第3章 操作を覚えよう', completed: false, type: 'video' as const },
          { id: 11, title: 'Figma｜第4章 早押し練習をしよう', completed: false, type: 'assignment' as const },
          { id: 12, title: 'Figma｜第5章 操作練習をスペキャンペツチャートを作ってみよう', completed: false, type: 'video' as const },
          { id: 13, title: 'Figma｜第6章 操作練習をスペキャンのフラッシト基盤をしてみよう', completed: false, type: 'video' as const },
          { id: 14, title: 'Figma｜第7章 操作練習をスペキャンのデザインを書き出してみよう', completed: false, type: 'video' as const },
          { id: 15, title: 'Figma｜第8章 操作練習をスペキャンのプロトタイプを盛ちつけよう', completed: false, type: 'video' as const },
          { id: 16, title: 'Figma｜第9章 操作練習をスペキャンのハイピがり', completed: false, type: 'assignment' as const },
          { id: 17, title: 'Figma｜ショートカット集', completed: false, type: 'text' as const },
        ],
      },
    ],
  };

  const menuItems = [
    '学習の心得',
    'WEBデザイン',
    'WEB制作・デザイナー',
    'WEB制作',
    '動画編集',
    '生成AI講座',
    'ビジネススキル',
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleToggleLesson = (sectionId: number, lessonId: number) => {
    // レッスンの完了状態をトグル（実際はAPIと連携）
    console.log(`Toggle lesson ${lessonId} in section ${sectionId}`);
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* サイドバー */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 240,
            bgcolor: 'white',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ color: '#C62828', fontWeight: 'bold', mb: 2 }}>
            WEBCOACH
          </Typography>
          <List>
            {menuItems.map((item, index) => (
              <ListItem
                key={index}
                sx={{
                  py: 1.5,
                  cursor: 'pointer',
                  bgcolor: index === 1 ? '#FFEBEE' : 'transparent',
                  '&:hover': { bgcolor: 'grey.100' },
                  borderLeft: index === 1 ? '4px solid #C62828' : 'none',
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <FiberManualRecord sx={{ fontSize: 8, color: index === 1 ? '#C62828' : 'grey.400' }} />
                </ListItemIcon>
                <ListItemText
                  primary={item}
                  primaryTypographyProps={{
                    fontWeight: index === 1 ? 'bold' : 'normal',
                    color: index === 1 ? '#C62828' : 'text.primary',
                    fontSize: '0.9rem',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* ヘッダー */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#C62828', fontWeight: 'bold' }}>
            WEBCOACH
          </Typography>
          <IconButton color="inherit" onClick={onBack}>
            <ArrowBack />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* ヒーローセクション */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${skillData.color} 0%, ${skillData.color}CC 100%)`,
          color: 'white',
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body1" gutterBottom sx={{ fontWeight: 300 }}>
            {skillData.subtitle}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {skillData.title}
          </Typography>
        </Container>
      </Box>

      {/* タブナビゲーション */}
      <Box sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                minWidth: 100,
                fontWeight: 'bold',
              },
              '& .Mui-selected': {
                color: skillData.color,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: skillData.color,
                height: 3,
              },
            }}
          >
            {skillData.tabs.map((tab, index) => (
              <Tab key={index} label={tab} />
            ))}
          </Tabs>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* コンテンツエリア */}
        <Grid container spacing={3}>
          {/* メインコンテンツ */}
          <Grid size={{ xs: 12 }}>
            {skillData.sections.map((section) => (
              <Card key={section.id} sx={{ mb: 3 }}>
                <Box
                  sx={{
                    bgcolor: skillData.color,
                    color: 'white',
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {section.icon}
                    <Box>
                      <Typography variant="caption" display="block">
                        {section.subtitle}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {section.title}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <CardContent sx={{ p: 0 }}>
                  <List sx={{ py: 0 }}>
                    {section.lessons.map((lesson, index) => (
                      <ListItem
                        key={lesson.id}
                        sx={{
                          py: 2,
                          px: 3,
                          borderBottom: index < section.lessons.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'grey.50' },
                        }}
                        onClick={() => handleToggleLesson(section.id, lesson.id)}
                      >
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={lesson.completed}
                            tabIndex={-1}
                            disableRipple
                            icon={<CheckBoxOutlineBlank />}
                            checkedIcon={<CheckBox sx={{ color: skillData.color }} />}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={lesson.title}
                          primaryTypographyProps={{
                            fontWeight: lesson.completed ? 'normal' : 'medium',
                            color: lesson.completed ? 'text.secondary' : 'text.primary',
                          }}
                        />
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: lesson.type === 'video' ? '#2196F3' : lesson.type === 'assignment' ? '#FF9800' : '#4CAF50',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            ))}
          </Grid>
        </Grid>

        {/* ナビゲーションボタン */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button variant="outlined" onClick={onBack} sx={{ minWidth: 120 }}>
            戻る
          </Button>
        </Box>
      </Container>

      {/* フッター */}
      <Box sx={{ bgcolor: 'white', py: 2, mt: 6, borderTop: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © 2025 by WEBCOACH
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default SkillDetailPage;
