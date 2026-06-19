import NovaDemoSite from "@/app/_components/NovaDemoSite";

export const metadata = {
  title: "NovaCare Mulberry 1.5 Voice Demo",
  description: "NovaCare support demo using SILK Mulberry 1.5 WebSocket streaming voice.",
};

export default function NovaMulberryPage() {
  return <NovaDemoSite voiceMode="silk-mulberry" />;
}