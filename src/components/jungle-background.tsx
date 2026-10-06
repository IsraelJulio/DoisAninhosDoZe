import Image from "next/image";

export type JungleBackgroundName = "home" | "splash" | "soft" | "gifts" | "payment";

/**
 * Fundo de selva com overlay creme para garantir contraste do texto.
 * Os backgrounds do asset pack têm faixas escuras nas laterais; ampliamos levemente (scale)
 * para que fiquem fora da área visível.
 */
export function JungleBackground({
  name,
  overlay = "medium",
  priority = false,
}: {
  name: JungleBackgroundName;
  overlay?: "none" | "light" | "medium" | "strong";
  priority?: boolean;
}) {
  const overlayClass = {
    none: "",
    light: "bg-gradient-to-b from-cream/10 via-cream/30 to-cream/70",
    medium: "bg-gradient-to-b from-cream/40 via-cream/70 to-cream/90",
    strong: "bg-cream/85",
  }[overlay];

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <Image
        src={`/assets/backgrounds/jungle-${name}.webp`}
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 480px) 100vw, 480px"
        className="scale-[1.14] object-cover object-top"
      />
      {overlayClass && <div className={`absolute inset-0 ${overlayClass}`} />}
    </div>
  );
}
