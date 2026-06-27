import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      {/* 
        Desktop: offset left by sidebar width (240px or 64px when collapsed).
        We use md:ml-[240px] as default; collapsed state toggling is handled
        inside Sidebar itself and doesn't need to be mirrored here because the
        sidebar is fixed — the content area just needs enough left margin to
        avoid being covered.  A more dynamic solution would use CSS custom
        properties, but for the current product the 240px default is fine.

        Mobile: no left margin (sidebar is hidden), bottom padding so content
        doesn't hide behind the bottom tab bar (≈ 60px + safe area).
      */}
      <main className="flex-1 w-full md:ml-[240px] min-h-screen pb-[72px] md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
