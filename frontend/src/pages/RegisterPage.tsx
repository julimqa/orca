import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api/auth';
import { Mail, Lock, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await signup({ email, password, name });

      if (response.success) {
        setSuccess(response.message || '회원가입이 완료되었습니다!');

        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.message || '회원가입에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.png" alt="ORCA Logo" className="w-64 h-64 rounded-2xl object-contain shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">ORCA</h1>
          <p className="text-slate-500 mt-2">Create your account</p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">회원가입</h2>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm">{error}</div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="이름"
              type="text"
              icon={<User className="w-4 h-4" />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              data-testid="auth-register-name"
              required
            />

            <Input
              label="이메일"
              type="email"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              data-testid="auth-register-email"
              required
            />

            <Input
              label="비밀번호"
              type="password"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="최소 6자 이상"
              data-testid="auth-register-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-6"
              isLoading={loading}
              data-testid="auth-register-submit"
            >
              {loading ? '가입 중...' : '회원가입'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              로그인
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-8">© 2024 ORCA. All rights reserved.</p>
      </div>
    </div>
  );
};

export default RegisterPage;
