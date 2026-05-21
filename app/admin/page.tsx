export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
export default function AdminRoot() { redirect("/admin/settings"); }
