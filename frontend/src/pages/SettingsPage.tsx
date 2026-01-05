import React, { useState } from 'react';
import { useAuth } from '../features/auth';
import { User, Shield, Lock, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../api/axios';

const SettingsPage: React.FC = () => {
  const { user, setUser } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 프로필 수정 state
  const [name, setName] = useState(user?.name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // user가 변경되면 name state 업데이트
  React.useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  // 비밀번호 변경 state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    try {
      setIsSavingProfile(true);
      setError('');

      const response = await api.patch('/auth/profile', { name });

      if (response.data.success && response.data.user) {
        // 기존 사용자 정보에 업데이트된 정보 병합 (안전한 업데이트)
        const updatedUser = {
          ...user,
          ...response.data.user,
        };

        setUser(updatedUser);

        // 이벤트 발생 (호환성 유지)
        window.dispatchEvent(
          new CustomEvent('user-profile-updated', {
            detail: { oldName: user?.name, newName: name },
          })
        );

        setMessage('프로필이 업데이트되었습니다.');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '프로필 업데이트에 실패했습니다.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 비밀번호 필드를 입력해주세요.');
      return;
    }

    if (newPassword.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setIsChangingPassword(true);

      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.data.success) {
        setMessage('비밀번호가 변경되었습니다.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return <div className="p-10 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="p-8 w-full mx-auto max-w-[1200px]">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm">
          <Shield size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <p className="text-slate-500">Manage your account settings and preferences.</p>
        </div>
      </div>

      {/* Success Message */}
      {message && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium shadow-sm flex items-center">
          <Check className="w-4 h-4 mr-2" />
          {message}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium shadow-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Section */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <User size={20} className="text-indigo-600" />
              Profile Information
            </div>
          }
        >
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</div>
              <div className="text-sm text-slate-900">{user.email}</div>
              <div className="text-xs text-slate-400 mt-1">Email cannot be changed</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Role</div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                {user.role === 'ADMIN' ? 'Admin' : 'User'}
              </div>
            </div>

            <Input
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isSavingProfile}>
              Save Profile
            </Button>
          </form>
        </Card>

        {/* Password Section */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <Lock size={20} className="text-indigo-600" />
              Change Password
            </div>
          }
        >
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
            />

            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isChangingPassword}>
              Change Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
