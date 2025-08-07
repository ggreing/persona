// app/layout.tsx
import "@/styles/globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata = {
  title: "SAMSUNG Persona AI",
  description: "세일즈 상황 훈련을 위한 AI 기반 시뮬레이터",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
