import { AssetImage, type AssetPath } from "@/components/asset-image";
import { cn } from "@/lib/cn";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const placement: Record<Corner, string> = {
  "top-left": "-left-5 -top-4 -rotate-12",
  "top-right": "-right-5 -top-4 rotate-[200deg]",
  "bottom-left": "-left-6 bottom-24 rotate-[30deg]",
  "bottom-right": "-right-6 bottom-36 -rotate-[150deg]",
};

/** Folhas decorativas nos cantos (não interativas, balanço sutil). */
export function CornerLeaves({ corners, size = 84 }: { corners: Corner[]; size?: number }) {
  const leaves: AssetPath[] = [
    "/assets/decor/leaf-01.png",
    "/assets/decor/leaf-03.png",
    "/assets/decor/leaf-05.png",
    "/assets/decor/leaf-02.png",
  ];
  return (
    <>
      {corners.map((corner, i) => (
        <span key={corner} className={cn("pointer-events-none absolute z-[1]", placement[corner])} aria-hidden>
          <AssetImage
            src={leaves[i % leaves.length]!}
            displayWidth={size}
            className="animate-sway"
            style={{ animationDelay: `${i * 0.7}s` }}
          />
        </span>
      ))}
    </>
  );
}
