// Simple test page — no auth, no DB — just checks if routing works
// Visit /admin-test to verify Vercel is serving Next.js routes correctly
export const dynamic = "force-dynamic";

export default function AdminTest() {
  return (
    <div style={{ padding: 40, fontFamily: "monospace", background: "#0a0a0a", color: "#f0ebe0", minHeight: "100vh" }}>
      <p style={{ fontSize: 24, fontWeight: "bold" }}>✓ Routing works</p>
      <p style={{ opacity: 0.5, marginTop: 8 }}>If you see this, Next.js routes are working fine.</p>
      <p style={{ opacity: 0.3, marginTop: 16, fontSize: 12 }}>
        SUPABASE_URL set: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "yes" : "NO — add to Vercel env vars"}
      </p>
      <p style={{ opacity: 0.3, marginTop: 4, fontSize: 12 }}>
        ANON_KEY set: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "yes" : "NO — add to Vercel env vars"}
      </p>
      <p style={{ opacity: 0.3, marginTop: 4, fontSize: 12 }}>
        SERVICE_ROLE set: {process.env.SUPABASE_SERVICE_ROLE_KEY ? "yes" : "NO — add to Vercel env vars"}
      </p>
      <p style={{ opacity: 0.3, marginTop: 4, fontSize: 12 }}>
        ADMIN_EMAILS set: {process.env.PLATFORM_ADMIN_EMAILS ? "yes" : "NO — add to Vercel env vars"}
      </p>
    </div>
  );
}
