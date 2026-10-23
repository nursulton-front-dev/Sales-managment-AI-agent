import { redirect } from 'next/navigation';

export default function RootPage() {
  // Directly redirect root to dashboard as specified in requirements
  redirect('/dashboard');
}
