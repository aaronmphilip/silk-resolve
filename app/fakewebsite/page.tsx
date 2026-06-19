import NovaDemoSite from "@/app/_components/NovaDemoSite";

export const metadata = {
  title: "NovaCare MUGA Streaming Voice Demo",
  description: "NovaCare support demo using SILK MUGA WebSocket streaming for sub-second voice latency.",
};

export default function FakeWebsite() {
  return <NovaDemoSite voiceMode="silk-stream" />;
}
