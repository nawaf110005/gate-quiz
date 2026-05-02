import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gate of Decision',
  description: 'Live multiplayer quiz — decide fast, decide right',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="gate-bg">{children}</body>
    </html>
  );
}
