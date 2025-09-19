"use client";
import { ComponentProps, useEffect } from "react";
import { Streams } from "./streams";
import { Chess } from "../chess";
import { cn } from "@konekt/ui/utils";
import { useRouter } from "next/navigation";
import { useReadLocalStorage } from "usehooks-ts";
import { USER_GAME_PREFERENCE, USER_NAME_KEY } from "lib/constant";
import { useIsClient } from "@uidotdev/usehooks";
import { TicTacToe } from "@components/tic-tac-toe";

type HomePropsType = ComponentProps<"div">;

export function Home({ className, ...restProps }: HomePropsType) {
  const userName = useReadLocalStorage(USER_NAME_KEY);
  const gamePreference = useReadLocalStorage(USER_GAME_PREFERENCE);
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
          "p-4 flex gap-6 h-full flex-col lg:flex-row! items-center justify-center",
          className
        )}
        {...restProps}
      >
        {gamePreference === "chess" ? <Chess /> : <TicTacToe />}
        <Streams gamePreference={gamePreference as string} userName={userName as string} />
      </div>
    );
}
