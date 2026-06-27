import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const { register, loginWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    try { await register(email, password); setDone(true); }
    catch (err) { setError(err.message); }
  };

  if (done) return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-800 rounded-2xl border border-zinc-700 p-8 text-center">
        <h1 className="text-xl font-bold text-white mb-2">Подтвердите email</h1>
        <p className="text-zinc-400 text-sm">Проверьте почту {email} и перейдите по ссылке для активации.</p>
        <Link to="/login" className="text-amber-400 hover:underline text-sm mt-4 block">Войти</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-800 rounded-2xl border border-zinc-700 p-8 space-y-6">
        <h1 className="text-xl font-bold text-white text-center">Регистрация</h1>
        <Button variant="outline" className="w-full bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600" onClick={loginWithGoogle}>
          Войти через Google
        </Button>
        {error && <div className="p-3 rounded bg-red-900/30 text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-zinc-700 border-zinc-600 text-white h-11" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Пароль</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-zinc-700 border-zinc-600 text-white h-11" required />
          </div>
          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white h-11">Создать аккаунт</Button>
        </form>
        <p className="text-center text-sm text-zinc-500">Уже есть аккаунт? <Link to="/login" className="text-amber-400 hover:underline">Войти</Link></p>
      </div>
    </div>
  );
}
