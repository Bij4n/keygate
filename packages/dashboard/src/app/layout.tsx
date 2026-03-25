import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Keygate',
  description: 'Credential broker and access control for AI agents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
