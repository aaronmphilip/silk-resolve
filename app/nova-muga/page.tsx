import NovaDemoSite from "@/app/_components/NovaDemoSite";

export const metadata = {
  title: "NovaCare MUGA Voice Demo",
  description: "NovaCare support demo using SILK MUGA voice.",
};

export default function NovaMugaPage() {
  return <NovaDemoSite voiceMode="silk-stream" />;
}
