import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { Toaster } from 'sonner';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

export const metadata: Metadata = {
    title: {
        default: 'Stoqle Admin',
        template: '%s | Stoqle Admin',
    },
    description: 'Internal admin dashboard for Stoqle platform management.',
    robots: 'noindex, nofollow', // Admin panel should never be indexed
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
            <body>
                <AdminAuthProvider>
                    {children}
                    <Toaster
                        position="top-right"
                        richColors
                        closeButton
                        toastOptions={{ duration: 4000 }}
                    />
                </AdminAuthProvider>
            </body>
        </html>
    );
}
