import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import { WishlistProvider } from "@/context/WishlistContext";
import BottomWidgetsNav from "@/components/BottomWidgetsNav";
import { ShippingSettingsProvider } from "@/context/ShippingSettingsContext";
import { ZonePriceRulesProvider } from "@/context/ZonePriceRulesContext";
import MotionEnhancer from "@/components/MotionEnhancer";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "AR Garment - Ethnic Wear E-Commerce",
  description: "Tradition In Every Thread - Elegant ethnic wear for every occasion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>
          <AuthProvider>
            <ShippingSettingsProvider>
              <ZonePriceRulesProvider>
                <CartProvider>
                  <WishlistProvider>
                    {children}
                    <BottomWidgetsNav />
                    <MotionEnhancer />
                  </WishlistProvider>
                </CartProvider>
              </ZonePriceRulesProvider>
            </ShippingSettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
