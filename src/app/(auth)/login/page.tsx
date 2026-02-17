import { redirect } from 'next/navigation';

// Login is now handled on the landing page (/)
export default function LoginPage() {
  redirect('/');
}
