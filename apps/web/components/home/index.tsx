"use client";
import { ComponentProps } from "react";
import { VideoPlayers } from "./video-players";
import { Game } from "./game";
import { cn } from "@konekt/ui/utils";

type HomePropsType = ComponentProps<"div">;

export function Home({ className, ...restProps }: HomePropsType) {
  return (
    <div
      className={cn(
        "space-y-4 px-4 flex gap-6 items-center justify-center",
        className
      )}
      {...restProps}
    >
      <VideoPlayers className="w-1/5" />
      <Game />
    </div>
  );
}
