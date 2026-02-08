const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const { pipeline } = require("@xenova/transformers");

// Configuration
const DOCUMENTS_DIR = "./documents";
const OUTPUT_FILE = "./embeddings.json";
const CHUNK_SIZE = 500; // Taille des morceaux de texte en caractères

// Fonction pour découper le texte en morceaux
function chunkText(text, chunkSize = CHUNK_SIZE) {
  const chunks = [];
  const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];

  let currentChunk = "";

  for (const sentence of sentences) {
    if (
      (currentChunk + sentence).length > chunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Fonction principale
async function processDocuments() {
  console.log("🚀 Démarrage du traitement des documents...\n");

  // Vérifier que le dossier documents existe
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    console.error(`❌ Le dossier "${DOCUMENTS_DIR}" n'existe pas.`);
    return;
  }

  // Lire tous les fichiers du dossier
  const files = fs.readdirSync(DOCUMENTS_DIR);
  const supportedFiles = files.filter((file) => file.endsWith(".txt"));

  if (supportedFiles.length === 0) {
    console.error("❌ Aucun fichier TXT trouvé dans le dossier documents/");
    return;
  }

  console.log(`📁 ${supportedFiles.length} document(s) trouvé(s)\n`);

  // Extraire le texte de tous les documents
  const documents = [];

  for (const file of supportedFiles) {
    const filePath = path.join(DOCUMENTS_DIR, file);
    let text = "";

    try {
      console.log(`📄 Lecture de: ${file}`);
      text = fs.readFileSync(filePath, "utf-8");

      // Nettoyer le texte
      text = text.replace(/\s+/g, " ").trim();

      if (text.length > 0) {
        documents.push({
          filename: file,
          text: text,
          chunks: chunkText(text),
        });
        console.log(`   ✅ ${text.length} caractères extraits`);
      } else {
        console.log(`   ⚠️  Aucun texte extrait`);
      }
    } catch (error) {
      console.error(`   ❌ Erreur: ${error.message}`);
    }
  }

  console.log(
    `\n📝 Total: ${documents.reduce((sum, doc) => sum + doc.chunks.length, 0)} morceaux de texte créés`,
  );

  // Créer les embeddings
  console.log(
    "\n🧠 Création des embeddings (cela peut prendre quelques minutes)...",
  );

  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
  );

  const embeddedDocuments = [];
  let processedChunks = 0;

  for (const doc of documents) {
    console.log(`\n📌 Traitement: ${doc.filename}`);

    for (let i = 0; i < doc.chunks.length; i++) {
      const chunk = doc.chunks[i];

      try {
        const output = await embedder(chunk, {
          pooling: "mean",
          normalize: true,
        });
        const embedding = Array.from(output.data);

        embeddedDocuments.push({
          filename: doc.filename,
          chunkIndex: i,
          text: chunk,
          embedding: embedding,
        });

        processedChunks++;
        process.stdout.write(
          `   Progression: ${processedChunks}/${documents.reduce((sum, d) => sum + d.chunks.length, 0)}\r`,
        );
      } catch (error) {
        console.error(`\n   ❌ Erreur sur le morceau ${i}: ${error.message}`);
      }
    }
  }

  console.log("\n");

  // Sauvegarder les embeddings
  console.log("💾 Sauvegarde des embeddings...");
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        totalDocuments: documents.length,
        totalChunks: embeddedDocuments.length,
        documents: embeddedDocuments,
      },
      null,
      2,
    ),
  );

  const fileSize = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`✅ Fichier créé: ${OUTPUT_FILE} (${fileSize} MB)`);
  console.log("\n🎉 Traitement terminé avec succès!");
}

// Exécuter
processDocuments().catch(console.error);
