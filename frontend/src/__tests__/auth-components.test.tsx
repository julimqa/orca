import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider, useAuth, PrivateRoute, RequireAdmin } from '../features/auth';

function DebugAuth() {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();
  return (
    <div>
      <div data-testid="isLoading">{String(isLoading)}</div>
      <div data-testid="isAuthenticated">{String(isAuthenticated)}</div>
      <div data-testid="isAdmin">{String(isAdmin)}</div>
      <div data-testid="userEmail">{user?.email ?? ''}</div>
      <div data-testid="userRole">{user?.role ?? ''}</div>
    </div>
  );
}

function renderWithAuth(ui: React.ReactNode, initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('AuthContext + route guards (component tests)', () => {
  it('새로고침 복원 로직: localStorage user가 있으면 인증 상태로 복원된다', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'u1',
        email: 'test1@tms.com',
        name: '테스트유저1',
        role: 'USER',
        status: 'ACTIVE',
      })
    );

    renderWithAuth(<DebugAuth />);

    // effect 이후 isLoading false + isAuthenticated true
    expect(await screen.findByTestId('isLoading')).toHaveTextContent('false');
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('userEmail')).toHaveTextContent('test1@tms.com');
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
  });

  it('PrivateRoute: 미인증 사용자는 /login으로 리다이렉트된다', async () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/testcases"
          element={
            <PrivateRoute>
              <div>Protected</div>
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<div>로그인</div>} />
      </Routes>,
      ['/testcases']
    );

    expect(await screen.findByText('로그인')).toBeInTheDocument();
  });

  it('PrivateRoute(requireAdmin): 일반 사용자는 / 로 리다이렉트된다', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'u1',
        email: 'test1@tms.com',
        name: '테스트유저1',
        role: 'USER',
        status: 'ACTIVE',
      })
    );

    renderWithAuth(
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route
          path="/admin"
          element={
            <PrivateRoute requireAdmin>
              <div>Admin</div>
            </PrivateRoute>
          }
        />
      </Routes>,
      ['/admin']
    );

    expect(await screen.findByText('Home')).toBeInTheDocument();
  });

  it('RequireAdmin: 일반 사용자는 / 로 리다이렉트된다', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'u1',
        email: 'test1@tms.com',
        name: '테스트유저1',
        role: 'USER',
        status: 'ACTIVE',
      })
    );

    renderWithAuth(
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <RequireAdmin>
                <div>Administration</div>
              </RequireAdmin>
            </PrivateRoute>
          }
        />
      </Routes>,
      ['/admin']
    );

    expect(await screen.findByText('Home')).toBeInTheDocument();
  });

  it('RequireAdmin: 관리자는 /admin 화면이 렌더된다', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'a1',
        email: 'admin@tms.com',
        name: '관리자',
        role: 'ADMIN',
        status: 'ACTIVE',
      })
    );

    renderWithAuth(
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <RequireAdmin>
                <div>Administration</div>
              </RequireAdmin>
            </PrivateRoute>
          }
        />
      </Routes>,
      ['/admin']
    );

    expect(await screen.findByText('Administration')).toBeInTheDocument();
  });
});
