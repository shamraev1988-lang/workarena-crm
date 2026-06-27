import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await resetPassword(password); navigate('/login'); } catch {}
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-800 rounded-2xl border border-zinc-700 p-8 space-y-6">
        <h1 className="text-xl font-bold text-white text-center">Новый пароль</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Новый пароль</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-zinc-700 border-zinc-600 text-white h-11" required />
          </div>
          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white h-11">Сохранить</Button>
        </form>
      </div>
    </div>
  );
}
