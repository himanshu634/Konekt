import Image from "next/image";
import logo from "@assets/logo.png";

export function TopBar() {
  return (
    <nav className="py-4 px-6">
      <Image src={logo} alt="Logo" height={80} width={160} />
    </nav>
  );
}
