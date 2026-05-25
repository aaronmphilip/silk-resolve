import NovaDemoSite from "@/app/_components/NovaDemoSite";

export const metadata = {
  title: "NovaCare MUGA Streaming Voice Demo",
  description: "NovaCare support demo using SILK MUGA WebSocket streaming voice.",
};

export default function NovaMugaStreamPage() {
  return <NovaDemoSite voiceMode="silk-stream" />;
}
