import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { resetPasswordRequest } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await resetPasswordRequest(email); } catch {}
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-800 rounded-2xl border border-zinc-700 p-8 space-y-6">
        <h1 className="text-xl font-bold text-white text-center">Сброс пароля</h1>
        {sent ? (
          <p className="text-zinc-400 text-sm text-center">Ссылка отправлена на {email}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-zinc-700 border-zinc-600 text-white h-11" required />
            </div>
            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white h-11">Отправить</Button>
          </form>
        )}
        <Link to="/login" className="text-amber-400 hover:underline text-sm block text-center">← Назад</Link>
      </div>
    </div>
  );
}
