import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { controleCouvertureOrly, controleCouvertureProvince } from "./src/services/coverageControlService.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse large JSON payloads (base64 buffers)
  app.use(express.json({ limit: "50mb" }));

  // API Route for Coverage Control
  app.post("/api/coverage-control", async (req, res) => {
    try {
      const { zone, contractsFileBase64, planningFileBase64 } = req.body;

      if (!contractsFileBase64 || !planningFileBase64) {
        return res.status(400).json({ 
          error: "Les deux fichiers (contrats et planning) sont requis." 
        });
      }

      const bufferContrats = Buffer.from(contractsFileBase64, "base64");
      const bufferPlanning = Buffer.from(planningFileBase64, "base64");

      let result;
      if (zone === "province") {
        result = controleCouvertureProvince(bufferContrats, bufferPlanning);
      } else {
        result = controleCouvertureOrly(bufferContrats, bufferPlanning);
      }

      return res.json({
        success: true,
        zone,
        anomalies: result.anomalies,
        warnings: result.warnings,
        xlsxBase64: result.xlsxBase64
      });
    } catch (err: any) {
      console.error("Coverage control backend error:", err);
      return res.status(500).json({ 
        error: "Erreur serveur lors du traitement des fichiers : " + (err.message || String(err)) 
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
