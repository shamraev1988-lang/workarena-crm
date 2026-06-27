import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await loginWithEmail(email, password); navigate('/'); }
    catch (err) { setError(err.message || 'Ошибка входа'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-800 rounded-2xl border border-zinc-700 p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <h1 className="font-bold text-xl text-white">Workarena CRM</h1>
          <p className="text-sm text-zinc-400 mt-1">Войдите в систему</p>
        </div>

        <Button variant="outline" className="w-full h-11 bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600" onClick={loginWithGoogle}>
          Войти через Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-800 px-3 text-zinc-500">или</span>
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-900/30 text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-500 h-11" required />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-zinc-300">Пароль</Label>
              <Link to="/forgot-password" className="text-xs text-amber-400 hover:underline">Забыли?</Link>
            </div>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="bg-zinc-700 border-zinc-600 text-white h-11" required />
          </div>
          <Button type="submit" className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-medium" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Нет аккаунта? <Link to="/register" className="text-amber-400 hover:underline">Создать</Link>
        </p>
      </div>
    </div>
  );
}
