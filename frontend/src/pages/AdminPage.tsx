import React, { useEffect, useState } from 'react';
import { getAllUsers, approveUser, resetPassword, updateUserRole, updateUserStatus } from '../api/admin';
import { User } from '../api/types';
import { Shield, Users, Check, Key } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useAuth } from '../features/auth';
import { Input } from '../components/ui/Input'; // Input 컴포넌트 추가

const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Confirm modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Password Reset state (직접 입력)
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [manualPassword, setManualPassword] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getAllUsers();
      if (response.success) {
        setUsers(response.users);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load users:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (email: string, action: 'approve' | 'reject') => {
    const actionText = action === 'approve' ? '승인' : '거부';
    if (!confirm(`이 사용자를 ${actionText}하시겠습니까?`)) return;
    try {
      await approveUser({ email, action });
      loadUsers();
      setMessage(`사용자가 ${actionText}되었습니다.`);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      alert('작업에 실패했습니다.');
    }
  };

  // 비밀번호 초기화 모달 열기
  const handleResetPasswordClick = (user: User) => {
    setResetTargetUser(user);
    setManualPassword('');
  };

  // 비밀번호 초기화 실행 (관리자가 직접 입력)
  const handleManualResetConfirm = async () => {
    if (!resetTargetUser || !manualPassword) return;

    if (manualPassword.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    try {
      await resetPassword({ email: resetTargetUser.email, newPassword: manualPassword });
      setMessage('비밀번호가 초기화되었습니다.');
      setTimeout(() => setMessage(''), 3000);
      setResetTargetUser(null); // 모달 닫기
    } catch {
      alert('비밀번호 초기화에 실패했습니다.');
    }
  };

  // Role 변경 핸들러
  const handleRoleChange = (user: User, newRole: 'ADMIN' | 'USER') => {
    if (user.role === newRole) return;

    const roleText = newRole === 'ADMIN' ? '관리자' : '사용자';
    setConfirmModalData({
      title: 'Role 변경 확인',
      message: `${user.name}(${user.email})의 Role을 "${roleText}"(으)로 변경하시겠습니까?`,
      onConfirm: async () => {
        try {
          await updateUserRole({ email: user.email, role: newRole });
          loadUsers();
          setMessage('사용자 Role이 변경되었습니다.');
          setTimeout(() => setMessage(''), 3000);
        } catch {
          alert('Role 변경에 실패했습니다.');
        }
      },
    });
    setIsConfirmModalOpen(true);
  };

  // Status 변경 핸들러
  const handleStatusChange = (user: User, newStatus: 'ACTIVE' | 'REJECTED') => {
    if (user.status === newStatus) return;

    const statusText = newStatus === 'ACTIVE' ? '활성' : '비활성';
    setConfirmModalData({
      title: 'Status 변경 확인',
      message: `${user.name}(${user.email})의 Status를 "${statusText}"(으)로 변경하시겠습니까?`,
      onConfirm: async () => {
        try {
          await updateUserStatus({ email: user.email, status: newStatus });
          loadUsers();
          setMessage('사용자 Status가 변경되었습니다.');
          setTimeout(() => setMessage(''), 3000);
        } catch {
          alert('Status 변경에 실패했습니다.');
        }
      },
    });
    setIsConfirmModalOpen(true);
  };

  // 현재 사용자가 Admin인지 확인
  const isAdmin = currentUser?.role === 'ADMIN';

  const pendingUsers = users.filter((u) => u.status === 'PENDING');

  if (loading) return <div className="p-10 text-center text-slate-500">Loading...</div>;

  return (
    <div className="p-8 w-full mx-auto max-w-[1800px]">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm">
          <Shield size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Administration</h2>
          <p className="text-slate-500">Manage users, roles, and system settings.</p>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium shadow-sm flex items-center">
          <Check className="w-4 h-4 mr-2" />
          {message}
        </div>
      )}

      <div className="space-y-8">
        {/* Pending Approvals */}
        {pendingUsers.length > 0 && (
          <Card
            title={
              <div className="flex items-center gap-2">
                <Users size={20} className="text-amber-500" />
                Pending Approvals
                <Badge variant="warning" className="ml-2">
                  {pendingUsers.length}
                </Badge>
              </div>
            }
            noPadding
          >
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(user.createdAt!).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleApprove(user.email, 'approve')}
                        className="text-emerald-600 hover:text-emerald-900 font-medium text-xs uppercase tracking-wide"
                      >
                        Approve
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => handleApprove(user.email, 'reject')}
                        className="text-rose-600 hover:text-rose-900 font-medium text-xs uppercase tracking-wide"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* All Users */}
        <Card title="All Users" noPadding>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
                  Status
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isAdmin ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value as 'ADMIN' | 'USER')}
                        className="text-xs font-medium uppercase tracking-wide rounded-full px-3 py-1.5 border border-slate-300 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white hover:bg-slate-50"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="USER">User</option>
                      </select>
                    ) : (
                      <Badge variant={user.role === 'ADMIN' ? 'primary' : 'neutral'}>
                        {user.role === 'ADMIN' ? 'Admin' : 'User'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isAdmin ? (
                      <select
                        value={user.status}
                        onChange={(e) => handleStatusChange(user, e.target.value as 'ACTIVE' | 'REJECTED')}
                        className="text-xs font-medium uppercase tracking-wide rounded-full px-3 py-1.5 border border-slate-300 cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white hover:bg-slate-50"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="REJECTED">Deactive</option>
                      </select>
                    ) : (
                      <Badge variant={user.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {user.status === 'ACTIVE' ? 'Active' : 'Deactive'}
                      </Badge>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleResetPasswordClick(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                        title="Reset Password"
                      >
                        <Key size={14} />
                        Reset
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Confirm Modal */}
      {confirmModalData && (
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setConfirmModalData(null);
          }}
          onConfirm={confirmModalData.onConfirm}
          title={confirmModalData.title}
          message={confirmModalData.message}
          confirmText="변경"
          cancelText="취소"
          variant="warning"
        />
      )}
      {/* Password Reset Modal */}
      {resetTargetUser && (
        <ConfirmModal
          isOpen={!!resetTargetUser}
          onClose={() => setResetTargetUser(null)}
          onConfirm={handleManualResetConfirm}
          title="비밀번호 초기화"
          message={`${resetTargetUser.name}(${resetTargetUser.email})의 비밀번호를 초기화합니다. 새 비밀번호를 입력해주세요.`}
          confirmText="초기화"
          cancelText="취소"
          variant="warning"
        >
          <div className="mt-2">
            <Input
              label="새 비밀번호"
              type="text"
              value={manualPassword}
              onChange={(e) => setManualPassword(e.target.value)}
              placeholder="최소 6자 이상 입력"
              autoFocus
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default AdminPage;
