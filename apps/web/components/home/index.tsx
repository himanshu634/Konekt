"use client";
import { ComponentProps, useEffect } from "react";
import { VideoPlayers } from "./streams";
import { Game } from "./game";
import { cn } from "@konekt/ui/utils";
import { useRouter } from "next/navigation";
import { useReadLocalStorage } from "usehooks-ts";
import { USER_NAME_KEY } from "lib/constant";

type HomePropsType = ComponentProps<"div">;

export function Home({ className, ...restProps }: HomePropsType) {
  const userName = useReadLocalStorage(USER_NAME_KEY);
  const router = useRouter();

  useEffect(() => {
    if (!userName) {
      router.replace("/");
    }
  }, [router, userName]);

  return (
    <div
      className={cn(
        "space-y-4 px-4 flex gap-6 items-center justify-center",
        className
      )}
      {...restProps}
    >
      <VideoPlayers className="w-1/5" userName={userName as string} />
      <Game />
    </div>
  );
}
