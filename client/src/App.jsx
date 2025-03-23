import sodium from "libsodium-wrappers";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './App.css';

// Components
import Sidebar from "./components/Navbar/Navbar";
import ProtectedRoute from './routes/login/ProtectedRoute';

// Admin Routes
import AddQuestion from './routes/Admin/Addquestion/Addquestion';
import AdminDashboard from './routes/Admin/AdminDashboard/AdminDashboard';
import AdminCompiler from './routes/Admin/QuestionList/Compiler';
import QuestionList from './routes/Admin/QuestionList/QuestionList';
import AddVenue from './routes/Admin/Venue/Venue';
import VenueManagement from './routes/Admin/VenueManagment/venuemanagement';
import QuestionDetails from './routes/complier/QuestionDetails/QuestionDetails';

// Student Routes
import DocumentEditor from "./routes/Admin/DocumentEditor/DocumentEditor";
import DocumentList from "./routes/Admin/DocumentViewer/DocumentList";
import PracticeProgress from "./routes/Admin/PracticeProgressView/progressview";
import PracticeQuestion from "./routes/Admin/PracticeQuestion/practicequestion";
import StudyMaterialUpload from "./routes/Admin/studymaterial/studymaterialupload";
import AllLevels from './routes/Alllevel/alllevel';
import AssessmentGuidelines from "./routes/AssessmentGuidelines/AssessmentGuidelines";
import Visualizer from "./routes/Code visualizer/Visualizer";
import Dashboard from './routes/Dashboard/Dashboard';
import Mycourse from './routes/My-courses/mycourse';
import Eligiblelevel from './routes/eligiblelevel/eligiblelevel';
import LearningMaterial from './routes/learningmaterial/learningmaterial';
import Login from './routes/login/login';
import StudyMaterial from "./routes/studymaterial/studymaterial";
import PracticeQuestionCompiler from './routes/complier/QuestionDetails/PracticeQuestion';

// Create an auth context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      await sodium.ready;
      setLoading(true);

      const encryptedData = sessionStorage.getItem("token");
      if (!encryptedData) {
        setLoading(false);
        return;
      }

      try {
        const { encrypted, nonce } = JSON.parse(encryptedData);
        const cryptoKey = sodium.from_base64(import.meta.env.VITE_SECRET_KEY);

        const decrypted = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(encrypted),
          sodium.from_base64(nonce),
          cryptoKey
        );

        const token = new TextDecoder().decode(decrypted);
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));

        if (decodedPayload?.userDetails) {
          setUser(decodedPayload.userDetails);
        }
      } catch (error) {
        console.error("❌ Token decryption failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Set up an event listener for storage changes
    const handleStorageChange = () => {
      fetchUser();
    };

    window.addEventListener('authStateChanged', handleStorageChange);
    return () => {
      window.removeEventListener('authStateChanged', handleStorageChange);
    };
  }, []);

  // Provide a method to update the user
  const updateUser = (newUserData) => {
    setUser(newUserData);
    // Dispatch an event to notify other components
    window.dispatchEvent(new CustomEvent('authStateChanged'));
  };

  return (
    <AuthContext.Provider value={{ user, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const ConditionalSidebar = () => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Define routes where sidebar should NOT be shown
  const hideSidebarPaths = [
    '/login',
    '/question-list/compiler',
    '/question/',
    '/courses/:courseId/',
    '/assessment/',
    '/practicequestions/:id',
  ];

  // Check if current path is QuestionDetails component (when rendered from LearningMaterial)
  const isQuestionDetailsActive = location.pathname.includes('/courses/') && location.pathname.includes('levelId');

  // Check if sidebar should be hidden
  const shouldHideSidebar = hideSidebarPaths.some(path => 
    location.pathname.includes(path)
  ) || isQuestionDetailsActive;

  // Combine conditions for sidebar visibility
  const showSidebar = !shouldHideSidebar && !loading && 
    (user?.role === 'admin' || user?.role === 'Student');

  return showSidebar ? <Sidebar /> : null;
};

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && location.pathname === "/login") {
      // Redirect to respective dashboard
      const redirectPath = user.role === "admin" ? "/admin-dashboard" : "/dashboard";
      navigate(redirectPath, { replace: true });
    }
  }, [user, location.pathname, navigate]);

  if (loading && location.pathname !== "/login") {
    // You might want to show a loading indicator here
    return <div>Loading...</div>;
  }

  return (
    <div className="app-container">
      <ConditionalSidebar />
      <main className="main-content">
        <Routes>
          {/* Admin Routes */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/question"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <QuestionList />
              </ProtectedRoute>
            }
          />
          
          <Route path="/question-list/compiler/:id" element={<AdminCompiler />} />

          <Route
            path="/add-question"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AddQuestion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practicequestions/:id"            
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <PracticeQuestionCompiler/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-venue"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AddVenue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/venue-management"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <VenueManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice-question"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PracticeQuestion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-practice-progress"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PracticeProgress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study-material-upload"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <StudyMaterialUpload />
              </ProtectedRoute>
            }
          />
          {/* Student Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-courses"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <Mycourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eligible-levels"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <Eligiblelevel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <LearningMaterial />
              </ProtectedRoute>
            }
          />
          <Route
            path="/programs/:id"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <AllLevels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessment/:id/guidelines"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <AssessmentGuidelines />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessment/:id"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <QuestionDetails />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<Login />} />
          {/* Document list and viewer */}
          <Route path="/documents" element={<DocumentList />} />
          
          {/* Document editor routes */}
          <Route path="/editor" element={<DocumentEditor />} />
          <Route path="/editor/:id" element={<DocumentEditor />} />

          <Route path="/studymaterial/:courseId" element={<StudyMaterial />} />
          <Route path="/visualizer" element={<Visualizer />} />
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;