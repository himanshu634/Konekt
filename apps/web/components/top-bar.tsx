import Image from "next/image";
import logo from "@assets/logo.png";
import { ComponentProps } from "react";
import { cn } from "@konekt/ui/utils";

type TopBarProps = ComponentProps<"nav">;

export function TopBar({ className, ...restProps }: TopBarProps) {
  return (
    <nav
      className={cn(
        "py-4 px-6 bg-transparent backdrop-blur-sm z-50 border-b-foreground border-b",
        className
      )}
      {...restProps}
    >
      <Image src={logo} alt="Logo" height={40} width={80} />
    </nav>
  );
}
