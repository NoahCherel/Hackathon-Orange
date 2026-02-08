import express from "express";
import { MongoClient } from "mongodb";
import { config } from "dotenv";
import cors from "cors";
import { readFile } from "fs/promises";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";

// Charger les variables d'environnement
config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = "sdwan_fleet";

// Middleware
app.use(cors());
app.use(express.json());

// Connexion MongoDB
let db;
const client = new MongoClient(MONGO_URI);

async function connectDB() {
  try {
    await client.connect();
    db = client.db(DB_NAME);
    console.log("✓ Connecté à MongoDB");
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB:", error);
    process.exit(1);
  }
}

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "SD-WAN API Documentation",
}));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Point d'entrée de l'API
 *     tags: [Root]
 *     description: Retourne les informations de base de l'API et la liste des endpoints disponibles
 *     responses:
 *       200:
 *         description: Informations de l'API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 version:
 *                   type: string
 *                 endpoints:
 *                   type: object
 */
// Route racine
app.get("/", (req, res) => {
  res.json({
    message: "SD-WAN Fleet Management API",
    version: "1.0.0",
    endpoints: {
      swagger: "/api-docs",
      embeddings: "/embeddings",
      hosts: "/api/hosts",
      models: "/api/models",
      versionPaths: "/api/version-paths",
    },
  });
});

/**
 * @swagger
 * /embeddings:
 *   get:
 *     summary: Récupère tous les embeddings
 *     tags: [Embeddings]
 *     description: Retourne le fichier embeddings.json utilisé pour le RAG
 *     responses:
 *       200:
 *         description: Liste des embeddings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Route pour servir le fichier embeddings.json
app.get("/embeddings", async (req, res) => {
  try {
    const data = await readFile("./embeddings.json", "utf-8");
    const embeddings = JSON.parse(data);
    res.json({
      success: true,
      count: embeddings.length,
      data: embeddings,
    });
  } catch (error) {
    console.error("Erreur /embeddings:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la lecture du fichier embeddings",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/hosts:
 *   get:
 *     summary: Récupère la liste des hôtes
 *     tags: [Hosts]
 *     description: Retourne tous les hôtes avec filtrage et tri optionnels
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ok, warning, critical]
 *         description: Filtrer par statut
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *         description: Filtrer par modèle
 *       - in: query
 *         name: lifecycleStatus
 *         schema:
 *           type: string
 *           enum: [CURRENT, EOL, APPROACHING_EOL]
 *         description: Filtrer par statut de cycle de vie
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limiter le nombre de résultats
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: 'Trier les résultats (format: champ:asc ou champ:desc)'
 *         example: 'throughput:desc'
 *     responses:
 *       200:
 *         description: Liste des hôtes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 total:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Host'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Routes API - HOSTS
app.get("/api/hosts", async (req, res) => {
  try {
    const { status, model, lifecycleStatus, limit, sort } = req.query;

    // Construire le filtre
    const filter = {};
    if (status) filter.status = status;
    if (model) filter.model = model;
    if (lifecycleStatus) filter["lifecycle.status"] = lifecycleStatus;

    // Construire le tri
    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(":");
      sortOptions[field] = order === "desc" ? -1 : 1;
    } else {
      sortOptions.host = 1; // Tri par défaut
    }

    const hosts = await db
      .collection("hosts")
      .find(filter)
      .sort(sortOptions)
      .limit(limit ? parseInt(limit) : 0)
      .toArray();

    // Statistiques
    const total = await db.collection("hosts").countDocuments(filter);

    res.json({
      success: true,
      count: hosts.length,
      total,
      data: hosts,
    });
  } catch (error) {
    console.error("Erreur /api/hosts:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des hosts",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/hosts/{hostname}:
 *   get:
 *     summary: Récupère un hôte spécifique
 *     tags: [Hosts]
 *     parameters:
 *       - in: path
 *         name: hostname
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom de l'hôte
 *     responses:
 *       200:
 *         description: Détails de l'hôte
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Host'
 *       404:
 *         description: Hôte non trouvé
 *       500:
 *         description: Erreur serveur
 */
// Route pour un host spécifique
app.get("/api/hosts/:hostname", async (req, res) => {
  try {
    const host = await db
      .collection("hosts")
      .findOne({ host: req.params.hostname });

    if (!host) {
      return res.status(404).json({
        success: false,
        error: "Host non trouvé",
      });
    }

    res.json({
      success: true,
      data: host,
    });
  } catch (error) {
    console.error("Erreur /api/hosts/:hostname:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération du host",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/hosts/stats/summary:
 *   get:
 *     summary: Statistiques globales des hôtes
 *     tags: [Hosts]
 *     description: Retourne des statistiques agrégées sur les hôtes (par statut, modèle, cycle de vie, utilisation)
 *     responses:
 *       200:
 *         description: Statistiques des hôtes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       500:
 *         description: Erreur serveur
 */
// Route pour les statistiques des hosts
app.get("/api/hosts/stats/summary", async (req, res) => {
  try {
    const stats = await db
      .collection("hosts")
      .aggregate([
        {
          $facet: {
            byStatus: [
              { $group: { _id: "$status", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            byModel: [
              { $group: { _id: "$model", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            byLifecycle: [
              { $group: { _id: "$lifecycle.status", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ],
            utilization: [
              {
                $group: {
                  _id: null,
                  avgThroughputUtilization: {
                    $avg: "$utilizationMetrics.throughputPercentage",
                  },
                  avgFlowsUtilization: {
                    $avg: "$utilizationMetrics.flowsPercentage",
                  },
                  maxThroughputUtilization: {
                    $max: "$utilizationMetrics.throughputPercentage",
                  },
                  maxFlowsUtilization: {
                    $max: "$utilizationMetrics.flowsPercentage",
                  },
                },
              },
            ],
          },
        },
      ])
      .toArray();

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    console.error("Erreur /api/hosts/stats/summary:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des statistiques",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/models:
 *   get:
 *     summary: Récupère la liste des modèles
 *     tags: [Models]
 *     description: Retourne tous les modèles d'équipements avec leurs spécifications
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [CURRENT, EOL, APPROACHING_EOL]
 *         description: Filtrer par statut de cycle de vie
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: 'Trier les résultats (format: champ:asc ou champ:desc)'
 *     responses:
 *       200:
 *         description: Liste des modèles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Model'
 *       500:
 *         description: Erreur serveur
 */
// Routes API - MODELS
app.get("/api/models", async (req, res) => {
  try {
    const { status, sort } = req.query;

    // Construire le filtre
    const filter = {};
    if (status) filter.status = status;

    // Construire le tri
    const sortOptions = {};
    if (sort) {
      const [field, order] = sort.split(":");
      sortOptions[field] = order === "desc" ? -1 : 1;
    } else {
      sortOptions.model = 1; // Tri par défaut
    }

    const models = await db
      .collection("models")
      .find(filter)
      .sort(sortOptions)
      .toArray();

    // Enrichir avec le nombre de hosts par modèle
    const enrichedModels = await Promise.all(
      models.map(async (model) => {
        const hostCount = await db
          .collection("hosts")
          .countDocuments({ model: model.model });
        return { ...model, hostCount };
      })
    );

    res.json({
      success: true,
      count: enrichedModels.length,
      data: enrichedModels,
    });
  } catch (error) {
    console.error("Erreur /api/models:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des modèles",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/models/{modelName}:
 *   get:
 *     summary: Récupère un modèle spécifique
 *     tags: [Models]
 *     parameters:
 *       - in: path
 *         name: modelName
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du modèle
 *     responses:
 *       200:
 *         description: Détails du modèle avec la liste des hôtes utilisant ce modèle
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Modèle non trouvé
 *       500:
 *         description: Erreur serveur
 */
// Route pour un modèle spécifique
app.get("/api/models/:modelName", async (req, res) => {
  try {
    const model = await db
      .collection("models")
      .findOne({ model: req.params.modelName });

    if (!model) {
      return res.status(404).json({
        success: false,
        error: "Modèle non trouvé",
      });
    }

    // Ajouter les hosts de ce modèle
    const hosts = await db
      .collection("hosts")
      .find({ model: model.model })
      .toArray();

    res.json({
      success: true,
      data: {
        ...model,
        hosts,
        hostCount: hosts.length,
      },
    });
  } catch (error) {
    console.error("Erreur /api/models/:modelName:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération du modèle",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/version-paths:
 *   get:
 *     summary: Récupère tous les chemins de mise à niveau
 *     tags: [Version Paths]
 *     description: Retourne les chemins de mise à niveau disponibles entre différentes versions logicielles
 *     responses:
 *       200:
 *         description: Liste des chemins de version
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VersionPath'
 *       500:
 *         description: Erreur serveur
 */
// Routes API - VERSION PATHS
app.get("/api/version-paths", async (req, res) => {
  try {
    const versionPaths = await db
      .collection("versionPaths")
      .find()
      .sort({ versionRange: 1 })
      .toArray();

    res.json({
      success: true,
      count: versionPaths.length,
      data: versionPaths,
    });
  } catch (error) {
    console.error("Erreur /api/version-paths:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des chemins de version",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/version-paths/{versionRange}:
 *   get:
 *     summary: Récupère un chemin de mise à niveau spécifique
 *     tags: [Version Paths]
 *     parameters:
 *       - in: path
 *         name: versionRange
 *         required: true
 *         schema:
 *           type: string
 *         description: Plage de version (ex. "5.2.x to 6.1.0")
 *     responses:
 *       200:
 *         description: Détails du chemin de version
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VersionPath'
 *       404:
 *         description: Chemin de version non trouvé
 *       500:
 *         description: Erreur serveur
 */
// Route pour un chemin de version spécifique
app.get("/api/version-paths/:versionRange", async (req, res) => {
  try {
    const versionPath = await db
      .collection("versionPaths")
      .findOne({ versionRange: req.params.versionRange });

    if (!versionPath) {
      return res.status(404).json({
        success: false,
        error: "Chemin de version non trouvé",
      });
    }

    res.json({
      success: true,
      data: versionPath,
    });
  } catch (error) {
    console.error("Erreur /api/version-paths/:versionRange:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération du chemin de version",
      message: error.message,
    });
  }
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route non trouvée",
    path: req.path,
  });
});

// Démarrage du serveur
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📚 Documentation Swagger: http://localhost:${PORT}/api-docs`);
    console.log(`📚 Documentation API: http://localhost:${PORT}/`);
    console.log(`\nRoutes disponibles:`);
    console.log(`  GET  /embeddings`);
    console.log(`  GET  /api/hosts`);
    console.log(`  GET  /api/hosts/:hostname`);
    console.log(`  GET  /api/hosts/stats/summary`);
    console.log(`  GET  /api/models`);
    console.log(`  GET  /api/models/:modelName`);
    console.log(`  GET  /api/version-paths`);
    console.log(`  GET  /api/version-paths/:versionRange`);
    console.log(`\nExemples de filtres pour /api/hosts:`);
    console.log(`  ?status=critical`);
    console.log(`  ?model=Edge 840`);
    console.log(`  ?lifecycleStatus=EOL`);
    console.log(`  ?sort=throughput:desc&limit=10`);
  });
}

// Gestion de l'arrêt propre
process.on("SIGINT", async () => {
  console.log("\n\nArrêt du serveur...");
  await client.close();
  console.log("✓ Connexion MongoDB fermée");
  process.exit(0);
});

startServer().catch((error) => {
  console.error("❌ Erreur au démarrage:", error);
  process.exit(1);
});
