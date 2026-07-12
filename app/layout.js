import "./globals.css";

export const metadata = { title: "Flow — Write with direction", description: "A guided writing workspace for students." };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
