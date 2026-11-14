import type { Metadata } from 'next';
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Newsreader,
  Noto_Sans_Devanagari,
  Noto_Sans_Kannada,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans-latin',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600'],
  variable: '--font-indic-hi',
  display: 'swap',
});

const notoKannada = Noto_Sans_Kannada({
  subsets: ['kannada'],
  weight: ['400', '500', '600'],
  variable: '--font-indic-kn',
  display: 'swap',
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  weight: ['400', '500', '600'],
  variable: '--font-indic-ta',
  display: 'swap',
});

const notoTelugu = Noto_Sans_Telugu({
  subsets: ['telugu'],
  weight: ['400', '500', '600'],
  variable: '--font-indic-te',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Samjho — Understand Official Paperwork Safely',
  description:
    'Read bank notices, electricity bills, rent agreements, and government letters in your language. Personal identifiers are removed on your device before AI explanation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontClasses = [
    newsreader.variable,
    ibmPlexSans.variable,
    ibmPlexMono.variable,
    notoDevanagari.variable,
    notoKannada.variable,
    notoTamil.variable,
    notoTelugu.variable,
  ].join(' ');

  return (
    <html lang="en" className={fontClasses}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
