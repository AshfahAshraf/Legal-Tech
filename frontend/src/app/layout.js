import "./globals.css";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import Script from "next/script";

export const metadata = {
  title: "Legal Tech — Enterprise Legal Management",
  description:
    "Premium Legal Tech SaaS platform for law firms, advocates, and case management.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>

        {/* Razorpay Checkout Script */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
