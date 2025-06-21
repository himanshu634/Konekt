import { cn } from "@konekt/ui/utils";
import { ComponentProps } from "react";

type VideoPlayerProps = ComponentProps<"video"> & {
  userName?: string;
};

export function VideoPlayer({
  ref,
  userName,
  className,
  ...restProps
}: VideoPlayerProps) {
  return (
    <div className="relative">
      <video
        ref={ref}
        autoPlay
        playsInline
        className={cn(
          "rounded-2xl h-50 w-80 shrink-0 object-center object-cover overflow-clip border-4 border-blue-400",
          className
        )}
        {...restProps}
      />
      {userName && <UserNamePill userName={userName} />}
    </div>
  );
}

function UserNamePill({ userName }: { userName: string }) {
  return (
    <p className="absolute top-2 left-2 bg-secondary/80 rounded-full p-1 px-2">
      {userName}
    </p>
  );
}
