import React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Navbar } from "@/components/layout/navbar"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { Toaster } from "@/components/ui/toaster"
import { NextIntlClientProvider } from 'next-intl';

export const metadata: Metadata = {
  title: "AI Interview Platform",
  description: "Intelligent Virtual Interview System with Real-time Analysis",
  generator: 'v0.dev'
}

export default async function RootLayout({ children, params }: { children: React.ReactNode, params: { locale?: string } }) {
  const locale = params?.locale || 'en';
  let messages;
  try {
    messages = (await import(`../locales/${locale}.json`)).default;
  } catch (error) {
    // Fallback to English if locale file is missing
    try {
      messages = (await import(`../locales/en.json`)).default;
      if (process.env.NODE_ENV !== 'production') {
        console.error(`Locale file for '${locale}' not found. Falling back to 'en'.`);
      }
    } catch (fallbackError) {
      // If even the fallback is missing, use an empty object
      messages = {};
      if (process.env.NODE_ENV !== 'production') {
        console.error(`Fallback locale file 'en' not found. Using empty messages.`);
      }
    }
  }
  return (
    <html lang={locale}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navbar />
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
