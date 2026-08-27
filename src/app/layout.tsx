import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "CRONEWS",
  description: "뉴스로 완성하는 오늘의 가로세로 퀴즈",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
