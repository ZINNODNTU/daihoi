import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={
 title:"ĐẠI HỘI SỐ | Nền tảng điều hành đại hội",
 description:"Quản lý nhiều đại hội Đoàn – Hội, đại biểu, check-in QR, tài liệu và thống kê.",
};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="vi"><body>{children}</body></html>;
}
