import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "해피버디",
  description: "골프 라운드 룰로 모아 기부하는 서비스",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
        />
      </head>
      <body className="font-sans">
        <div className="mx-auto min-h-screen w-full max-w-[440px] bg-paper px-5 pb-10">
          {children}
        </div>
      </body>
    </html>
  );
}
