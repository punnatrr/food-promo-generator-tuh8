import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LAZYFOOD.AI — สร้างโปรโมชันร้านอาหารด้วย AI',
  description: 'เปลี่ยนเมนูเด็ดให้เป็นโพสต์โปรโมชันพร้อมภาพและแคปชันในไม่กี่คลิก',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
