import { NameInput } from "@components/name-input";
import { type Metadata } from "next";

export default function HomePage() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <NameInput />
    </div>
  );
}

export const metadata: Metadata = {
  title: "Konekt",
  description:
    "Konekt is a platform where you can play games with your friends and chat with them in real-time.",
  openGraph: {
    title: "Konekt",
    description:
      "Konekt is a platform where you can play games with your friends and chat with them in real-time.",
    url: "https://konekt.builtbyhimanshu.com",
    siteName: "Konekt",
    // images: [
    //   {
    //     url: "https://konekt.app/og-image.png",
    //     width: 1200,
    //     height: 630,
    //     alt: "Konekt",
    //   },
    // ],
  },
};
