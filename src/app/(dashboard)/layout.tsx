import { Sidebar } from '@/components/layout/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';
import { CommandPaletteShell } from '@/components/ui/CommandPaletteShell';
import SessionTimeoutModal from './_session-timeout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      <SessionTimeoutModal />
      <CommandPaletteShell />
    </ToastProvider>
  );
}
