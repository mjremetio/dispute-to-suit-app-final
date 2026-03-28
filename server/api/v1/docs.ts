import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import YAML from "yaml";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Load and parse the OpenAPI spec
const specPath = path.join(__dirname, "openapi.yaml");
const specFile = fs.readFileSync(specPath, "utf8");
const swaggerDocument = YAML.parse(specFile);

// Swagger UI options
const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 30px 0; }
    .swagger-ui .info .title { color: #1a1a2e; }
  `,
  customSiteTitle: "Dispute2Suit API Documentation",
  customfavIcon: "/favicon.ico",
};

// Serve the raw OpenAPI spec as JSON at /api/docs/openapi.json
router.get("/openapi.json", (_req, res) => {
  res.json(swaggerDocument);
});

// Serve the raw OpenAPI spec as YAML at /api/docs/openapi.yaml
router.get("/openapi.yaml", (_req, res) => {
  res.setHeader("Content-Type", "text/yaml");
  res.send(specFile);
});

// Serve Swagger UI at /api/docs
router.use("/", swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));

export { router as apiDocsRouter };
