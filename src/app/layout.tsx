import type { Metadata } from 'next';
import { Archivo_Black, DM_Sans } from 'next/font/google';
import './globals.css';

const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'ScorchLocal - DIY Marketing for Local Businesses',
  description: 'Transparent, ROI-focused marketing tools for local contractors and service businesses.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${archivoBlack.variable} ${dmSans.variable} font-body bg-char-900 text-ash-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
