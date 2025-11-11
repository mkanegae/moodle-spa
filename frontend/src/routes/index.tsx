import React from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import LoginPage from '../components/LoginPage';
import HomePage from '../components/HomePage';
import MyLearningPage from '../components/MyLearningPage';
import WebCoachDashboard from '../components/WebCoachDashboard';
import CareerPathPage from '../components/CareerPathPage';
import SkillDetailPage from '../components/SkillDetailPage';
import CoursesPage from '../components/CoursesPage';
import ContentRegistrationPage from '../components/ContentRegistrationPage';
import ContentListPage from '../components/ContentListPage';
import ModernContentListPage from '../components/ModernContentListPage';
import ModernContentCreator from '../components/ModernContentCreator';
import CourseContentPage from '../components/CourseContentPage';
import AnimatedPage from '../components/AnimatedPage';
import { useAuthStore } from '../store/authStore';
import { useCategoryStore } from '../store/categoryStore';
import { useNavigationStore } from '../store/navigationStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AnimatedPage>{children}</AnimatedPage>;
};

// Wrapper components to handle routing params
const WebCoachWrapper: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const setSelectedCareerPath = useNavigationStore((state) => state.setSelectedCareerPath);
  const setSelectedSkillId = useNavigationStore((state) => state.setSelectedSkillId);

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
      onNavigateToSkill={(skillId: number) => {
        setSelectedSkillId(skillId);
        navigate(`/skill/${skillId}`);
      }}
    />
  );
};

const CareerPathWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { pathId } = useParams<{ pathId: string }>();

  return (
    <CareerPathPage
      careerPath={pathId || 'web-designer'}
      onBack={() => navigate('/webcoach')}
    />
  );
};

const SkillDetailWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { skillId } = useParams<{ skillId: string }>();

  return (
    <SkillDetailPage
      skillId={parseInt(skillId || '1', 10)}
      onBack={() => navigate('/webcoach')}
    />
  );
};

const CoursesWrapper: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  return (
    <CoursesPage
      onLogout={() => {
        logout();
        navigate('/login');
      }}
      onNavigateToContentRegistration={() => navigate('/content-registration')}
      onNavigateToContentList={() => navigate('/content-list')}
      onNavigateToModernCreator={() => navigate('/modern-creator')}
    />
  );
};

const ContentRegistrationWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <ContentRegistrationPage onBack={() => navigate('/webcoach')} />;
};

const ContentListWrapper: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ModernContentListPage
      onBack={() => navigate('/webcoach')}
      onCourseSelect={(course) => navigate(`/course/${course.id}`)}
    />
  );
};

// Old content list page (with full functionality)
const OldContentListWrapper: React.FC = () => {
  const navigate = useNavigate();
  return <ContentListPage onBack={() => navigate('/webcoach')} />;
};

const ModernContentCreatorWrapper: React.FC = () => {
  const navigate = useNavigate();
  const categories = useCategoryStore((state) => state.categories);
  return <ModernContentCreator onBack={() => navigate('/webcoach')} categories={categories} />;
};

const HomePageWrapper: React.FC = () => {
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
};

const MyLearningWrapper: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  return (
    <MyLearningPage
      onLogout={() => {
        logout();
        navigate('/login');
      }}
    />
  );
};

const CourseContentWrapper: React.FC = () => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <CourseContentPage
      courseId={parseInt(courseId || '0', 10)}
      onBack={() => navigate('/my-learning')}
    />
  );
};

const AppRoutes: React.FC = () => {
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
        path="/home"
        element={
          <ProtectedRoute>
            <HomePageWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-learning"
        element={
          <ProtectedRoute>
            <MyLearningWrapper />
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
        path="/skill/:skillId"
        element={
          <ProtectedRoute>
            <SkillDetailWrapper />
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
        path="/content-registration"
        element={
          <ProtectedRoute>
            <ContentRegistrationWrapper />
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
        path="/content-list-old"
        element={
          <ProtectedRoute>
            <OldContentListWrapper />
          </ProtectedRoute>
        }
      />

      <Route
        path="/modern-creator"
        element={
          <ProtectedRoute>
            <ModernContentCreatorWrapper />
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

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
};

export default AppRoutes;
