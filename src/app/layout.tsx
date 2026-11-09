import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "মেস ম্যানেজার",
  description: "আপনার মেস-এর দৈনিক হিসাব সহজে রাখুন",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        {/* পেজ লোডের আগেই থিম বসানো (ফ্লিকার যেন না হয়)। ডিফল্ট: লাইট */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
