'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const { error } = await authClient.signOut();
          if (error) {
            toast.error('Gagal keluar dari sesi', {
              description: error.message ?? 'Origin auth belum dipercaya.',
            });
            return;
          }
          router.push('/login');
          router.refresh();
        } catch {
          toast.error('Gagal keluar dari sesi', {
            description: 'Koneksi auth tidak merespons.',
          });
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? 'Keluar...' : 'Keluar'}
    </Button>
  );
}
