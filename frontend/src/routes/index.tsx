import React from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import LoginPage from '../components/LoginPage';
import PasswordResetPage from '../components/PasswordResetPage';
import HomePage from '../components/HomePage';
import MyPage from '../components/MyPage';
import ProfilePage from '../components/ProfilePage';
import WebCoachDashboard from '../components/WebCoachDashboard';
import CareerPathPage from '../components/CareerPathPage';
import CoursesPage from '../components/CoursesPage';
import QuestsPage from '../components/QuestsPage';
import BadgesPage from '../components/BadgesPage';
import ContentListPage from '../components/ContentListPage';
import CourseContentPage from '../components/CourseContentPage';
import CourseStartPage from '../components/CourseStartPage';
import AnimatedPage from '../components/AnimatedPage';
import { AdminPage } from '../components/AdminPage';
import { useAuthStore } from '../store/authStore';
import { useNavigationStore } from '../store/navigationStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AnimatedPage>{children}</AnimatedPage>;
}

// Wrapper components to handle routing params
function WebCoachWrapper() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const setSelectedCareerPath = useNavigationStore((state) => state.setSelectedCareerPath);

  return (
    <WebCoachDashboard
      onLogout={() => {
        logout();
        navigate('/login');
      }}
      onNavigateToCareerPath={(path: string) => {
        setSelectedCareerPath(path);
        navigate(`/career-path/${path}`);
      }}
      onNavigateToSkill={() => {
        // Skill detail page removed
      }}
    />
  );
}

function CareerPathWrapper() {
  const navigate = useNavigate();
  const { pathId } = useParams<{ pathId: string }>();

  return (
    <CareerPathPage
      careerPath={pathId || 'web-designer'}
      onBack={() => navigate('/webcoach')}
    />
  );
}

function CoursesWrapper() {
  return <CoursesPage />;
}

function ContentListWrapper() {
  const navigate = useNavigate();
  return <ContentListPage onBack={() => navigate('/webcoach')} />;
}

function HomePageWrapper() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  return (
    <HomePage
      onLogout={() => {
        logout();
        navigate('/login');
      }}
    />
  );
}

function MyPageWrapper() {
  return <MyPage />;
}

function ProfilePageWrapper() {
  return <ProfilePage />;
}

function CourseStartWrapper() {
  return <CourseStartPage />;
}

function CourseContentWrapper() {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <CourseContentPage
      courseId={parseInt(courseId || '0', 10)}
      onBack={() => navigate('/courses')}
    />
  );
}

function QuestsPageWrapper() {
  // QuestsPage doesn't need any props for now, using mock data
  return <QuestsPage />;
}

function BadgesPageWrapper() {
  // BadgesPage doesn't need any props for now, using mock data
  return <BadgesPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AnimatedPage>
            <LoginPage />
          </AnimatedPage>
        }
      />

      <Route
        path="/password-reset"
        element={
          <AnimatedPage>
            <PasswordResetPage />
          </AnimatedPage>
        }
      />

      <Route
        path="/mypage"
        element={
          <ProtectedRoute>
            <MyPageWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePageWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePageWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/webcoach"
        element={
          <ProtectedRoute>
            <WebCoachWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/career-path/:pathId"
        element={
          <ProtectedRoute>
            <CareerPathWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <CoursesWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/content-list"
        element={
          <ProtectedRoute>
            <ContentListWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/course/:courseId/start"
        element={
          <ProtectedRoute>
            <CourseStartWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/course/:courseId"
        element={
          <ProtectedRoute>
            <CourseContentWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quests"
        element={
          <ProtectedRoute>
            <QuestsPageWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/badges"
        element={
          <ProtectedRoute>
            <BadgesPageWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
