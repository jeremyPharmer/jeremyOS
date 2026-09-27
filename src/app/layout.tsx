import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/AppProvider";
import { TopNav } from "@/components/TopNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LayoutProvider } from "@/components/LayoutProvider";
import {
  DEFAULT_HOME_LAYOUT,
  HOME_LAYOUT_STORAGE_KEY,
} from "@/lib/home-layouts";
import {
  DEFAULT_THEME_ID,
  THEME_LAYOUT_BOOT,
  THEME_STORAGE_KEY,
} from "@/lib/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "JeremyOS",
  description:
    "Jeremy's executive assistant and personal operating system — daily rhythm, journal, and fund in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f6f8",
  viewportFit: "cover",
};

const themeBootScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var layouts=${JSON.stringify(THEME_LAYOUT_BOOT)};var t=localStorage.getItem(k)||${JSON.stringify(DEFAULT_THEME_ID)};document.documentElement.setAttribute("data-theme",t);document.documentElement.setAttribute("data-layout",layouts[t]||"briefing");var hk=${JSON.stringify(HOME_LAYOUT_STORAGE_KEY)};var hl=localStorage.getItem(hk)||${JSON.stringify(DEFAULT_HOME_LAYOUT)};document.documentElement.setAttribute("data-home-layout",hl);}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(DEFAULT_THEME_ID)});document.documentElement.setAttribute("data-layout","briefing");document.documentElement.setAttribute("data-home-layout",${JSON.stringify(DEFAULT_HOME_LAYOUT)});}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <ThemeProvider>
          <LayoutProvider>
            <AppProvider>
              <div className="app-shell">
                <TopNav />
                {children}
              </div>
            </AppProvider>
          </LayoutProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
