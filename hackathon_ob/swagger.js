import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SD-WAN Fleet Management API',
      version: '1.0.0',
      description: 'API pour la gestion de la flotte SD-WAN avec support des modèles, hôtes et chemins de mise à niveau',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement',
      },
    ],
    tags: [
      {
        name: 'Root',
        description: 'Point d\'entrée de l\'API',
      },
      {
        name: 'Embeddings',
        description: 'Gestion des embeddings pour le RAG',
      },
      {
        name: 'Hosts',
        description: 'Gestion des hôtes SD-WAN',
      },
      {
        name: 'Models',
        description: 'Gestion des modèles d\'équipements',
      },
      {
        name: 'Version Paths',
        description: 'Chemins de mise à niveau des versions logicielles',
      },
    ],
    components: {
      schemas: {
        Host: {
          type: 'object',
          properties: {
            host: {
              type: 'string',
              description: 'Nom de l\'hôte',
              example: 'edge-paris-01',
            },
            model: {
              type: 'string',
              description: 'Modèle de l\'équipement',
              example: 'Edge 840',
            },
            status: {
              type: 'string',
              enum: ['ok', 'warning', 'critical'],
              description: 'Statut de l\'hôte',
            },
            softwareVersion: {
              type: 'string',
              description: 'Version du logiciel',
              example: '6.1.0',
            },
            throughput: {
              type: 'number',
              description: 'Débit actuel en Mbps',
            },
            flows: {
              type: 'number',
              description: 'Nombre de flux actifs',
            },
            lifecycle: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['CURRENT', 'EOL', 'APPROACHING_EOL'],
                },
                eolDate: {
                  type: 'string',
                  format: 'date',
                },
              },
            },
            utilizationMetrics: {
              type: 'object',
              properties: {
                throughputPercentage: {
                  type: 'number',
                },
                flowsPercentage: {
                  type: 'number',
                },
              },
            },
          },
        },
        Model: {
          type: 'object',
          properties: {
            model: {
              type: 'string',
              example: 'Edge 840',
            },
            status: {
              type: 'string',
              enum: ['CURRENT', 'EOL', 'APPROACHING_EOL'],
            },
            eolDate: {
              type: 'string',
              format: 'date',
            },
            specifications: {
              type: 'object',
              properties: {
                maxThroughput: {
                  type: 'number',
                  description: 'Débit maximum en Mbps',
                },
                maxFlows: {
                  type: 'number',
                  description: 'Nombre maximum de flux',
                },
              },
            },
          },
        },
        VersionPath: {
          type: 'object',
          properties: {
            versionRange: {
              type: 'string',
              example: '5.2.x to 6.1.0',
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  version: {
                    type: 'string',
                  },
                  releaseDate: {
                    type: 'string',
                  },
                  releaseNotesUrl: {
                    type: 'string',
                  },
                },
              },
            },
            duration: {
              type: 'string',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Message d\'erreur',
            },
            message: {
              type: 'string',
            },
          },
        },
      },
    },
  },
  apis: ['./server.js'], // Fichiers contenant les annotations
};

export const swaggerSpec = swaggerJsdoc(options);
