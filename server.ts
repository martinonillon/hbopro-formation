import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Admin endpoint to delete any user account using service role key when present
  const handleDeleteUserRoute = async (req: express.Request, res: express.Response) => {
    try {
      const { userId, email } = req.body;
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (serviceRoleKey && supabaseUrl) {
        const { createClient } = await import("@supabase/supabase-js");
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });

        // 1. Delete from profiles, users, registration_requests tables
        if (userId) {
          await adminSupabase.from("profiles").delete().eq("id", userId);
          await adminSupabase.from("users").delete().eq("id", userId);
        }
        if (email) {
          await adminSupabase.from("profiles").delete().eq("email", email);
          await adminSupabase.from("users").delete().eq("email", email);
          await adminSupabase.from("registration_requests").delete().eq("email", email);
        }

        // 2. Delete from auth.users (first by userId, then lookup by email if needed)
        if (userId) {
          try {
            await adminSupabase.auth.admin.deleteUser(userId);
          } catch (authErr) {
            console.warn("Notice deleting auth user by id:", authErr);
          }
        }
        if (email) {
          try {
            const { data: usersList } = await adminSupabase.auth.admin.listUsers();
            const matchingAuthUser = usersList?.users?.find(
              (u: any) => u.email?.toLowerCase() === email.toLowerCase()
            );
            if (matchingAuthUser && matchingAuthUser.id !== userId) {
              await adminSupabase.auth.admin.deleteUser(matchingAuthUser.id);
            }
          } catch (authListErr) {
            console.warn("Notice listing/deleting auth user by email:", authListErr);
          }
        }
      }

      res.json({ success: true, message: "User deletion handled successfully." });
    } catch (err: any) {
      console.error("Error in delete user API:", err);
      res.status(500).json({ success: false, error: err?.message || "Internal error" });
    }
  };

  app.post("/api/admin/delete-pending-user", handleDeleteUserRoute);
  app.post("/api/admin/delete-user", handleDeleteUserRoute);

  // Admin endpoint to generate a secure recovery link using the service role key
  app.post("/api/admin/generate-recovery-link", async (req, res) => {
    try {
      const { email, redirectTo } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: "Email obligatoire" });
      }

      const cleanEmail = email.trim().toLowerCase();
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      const fallbackRedirect = redirectTo || (req.headers.origin as string) || "http://localhost:3000";

      if (serviceRoleKey && supabaseUrl) {
        const { createClient } = await import("@supabase/supabase-js");
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        const { data, error } = await adminSupabase.auth.admin.generateLink({
          type: "recovery",
          email: cleanEmail,
          options: {
            redirectTo: fallbackRedirect,
          },
        });

        if (error) {
          console.error("Supabase generateLink recovery error:", error);
          return res.status(400).json({ success: false, error: error.message });
        }

        const actionLink = data?.properties?.action_link;
        return res.json({
          success: true,
          action_link: actionLink,
          message: "Lien de réinitialisation généré avec succès.",
        });
      }

      // Local fallback if service role key is not configured in current environment
      const recoveryUrl = `${fallbackRedirect}/#type=recovery&email=${encodeURIComponent(cleanEmail)}&token=rec_${Date.now()}`;
      return res.json({
        success: true,
        action_link: recoveryUrl,
        message: "Lien généré (mode fallback sans service role key).",
      });
    } catch (err: any) {
      console.error("Error in generate-recovery-link API:", err);
      return res.status(500).json({ success: false, error: err?.message || "Erreur interne" });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
