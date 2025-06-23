"use client";
import { ComponentProps, useEffect } from "react";
import { VideoPlayers } from "./streams";
import { Chess } from "./chess";
import { cn } from "@konekt/ui/utils";
import { useRouter } from "next/navigation";
import { useReadLocalStorage } from "usehooks-ts";
import { USER_NAME_KEY } from "lib/constant";
import { useIsClient } from "@uidotdev/usehooks";

type HomePropsType = ComponentProps<"div">;

export function Home({ className, ...restProps }: HomePropsType) {
  const userName = useReadLocalStorage(USER_NAME_KEY);
  const router = useRouter();
  const isClient = useIsClient();

  useEffect(() => {
    if (!userName) {
      router.replace("/");
    }
  }, [router, userName]);

  if (isClient)
    return (
      <div
        className={cn(
          "space-y-4 px-4 flex gap-6 items-center justify-center",
          className
        )}
        {...restProps}
      >
        <Chess />
        <VideoPlayers className="w-1/5" userName={userName as string} />
      </div>
    );
}
