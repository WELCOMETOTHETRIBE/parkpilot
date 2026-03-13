import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ParkPilot',
  description: 'Parking-pass market intelligence and arbitrage operations platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
