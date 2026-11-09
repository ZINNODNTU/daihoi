import type {Metadata} from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "./globals.css";
export const metadata:Metadata={
 title:"ĐẠI HỘI SỐ | Nền tảng điều hành đại hội",
 description:"Quản lý nhiều đại hội Đoàn – Hội, đại biểu, check-in QR, tài liệu và thống kê.",
};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="vi"><body>{children}</body></html>;
}
