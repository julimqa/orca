import { createBrowserRouter, RouterProvider, RouteObject, Navigate } from 'react-router-dom';
import { AuthProvider, PrivateRoute, RequireAdmin } from './features/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import TestCasesPage from './pages/TestCasesPage';
import PlansPage from './pages/PlansPage';
import CreatePlanPage from './pages/CreatePlanPage';
import PlanDetailPage from './pages/PlanDetailPage';
import DashboardPage from './pages/DashboardPage';

const routerConfig: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: (
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/testcases',
        element: (
          <PrivateRoute>
            <TestCasesPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/plans',
        element: (
          <PrivateRoute>
            <PlansPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/plans/create',
        element: (
          <PrivateRoute>
            <CreatePlanPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/plans/:planId',
        element: (
          <PrivateRoute>
            <PlanDetailPage />
          </PrivateRoute>
        ),
      },
      {
        path: '/admin',
        element: (
          <PrivateRoute>
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          </PrivateRoute>
        ),
      },
      {
        path: '/settings',
        element: (
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

const router = createBrowserRouter(routerConfig);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
