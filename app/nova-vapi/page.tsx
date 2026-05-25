import NovaDemoSite from "@/app/_components/NovaDemoSite";

export const metadata = {
  title: "NovaCare Vapi Voice Demo",
  description: "NovaCare support demo using Vapi native voice.",
};

export default function NovaVapiPage() {
  return <NovaDemoSite voiceMode="vapi" />;
}
