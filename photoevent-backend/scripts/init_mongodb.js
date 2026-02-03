// Script d'initialisation MongoDB pour MongoDB Compass
// Copier-coller ce code dans Mongosh (en bas de Compass)

// Sélectionner la base de données
db = db.getSiblingDB('photoevent_db');

// Collection photos - Métadonnées des photos
db.createCollection("photos", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["event_id", "filename", "status"],
            properties: {
                event_id: {
                    bsonType: "int",
                    description: "ID de l'événement (référence PostgreSQL)"
                },
                filename: {
                    bsonType: "string",
                    description: "Nom du fichier original"
                },
                s3_key: {
                    bsonType: "string",
                    description: "Clé S3/MinIO du fichier original"
                },
                thumbnail_key: {
                    bsonType: "string",
                    description: "Clé S3/MinIO du thumbnail"
                },
                status: {
                    enum: ["pending", "processing", "ready", "error"],
                    description: "Statut du traitement"
                },
                faces_count: {
                    bsonType: "int",
                    description: "Nombre de visages détectés"
                },
                exif: {
                    bsonType: "object",
                    description: "Métadonnées EXIF"
                },
                uploaded_at: {
                    bsonType: "date",
                    description: "Date d'upload"
                },
                processed_at: {
                    bsonType: "date",
                    description: "Date de fin de traitement"
                }
            }
        }
    }
});

// Index pour recherches rapides
db.photos.createIndex({ event_id: 1, status: 1 });
db.photos.createIndex({ s3_key: 1 }, { unique: true });
db.photos.createIndex({ uploaded_at: -1 });

// Collection faces - Embeddings faciaux
db.createCollection("faces", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["photo_id", "event_id", "embedding"],
            properties: {
                photo_id: {
                    bsonType: "objectId",
                    description: "Référence à la photo"
                },
                event_id: {
                    bsonType: "int",
                    description: "ID de l'événement"
                },
                embedding: {
                    bsonType: "array",
                    description: "Vecteur embedding (128 dimensions)",
                    items: {
                        bsonType: "double"
                    }
                },
                bbox: {
                    bsonType: "object",
                    description: "Bounding box du visage",
                    properties: {
                        x: { bsonType: "int" },
                        y: { bsonType: "int" },
                        width: { bsonType: "int" },
                        height: { bsonType: "int" }
                    }
                },
                quality_score: {
                    bsonType: "double",
                    description: "Score de qualité du visage (0-1)"
                },
                created_at: {
                    bsonType: "date"
                }
            }
        }
    }
});

// Index pour recherches rapides par événement
db.faces.createIndex({ event_id: 1 });
db.faces.createIndex({ photo_id: 1 });
db.faces.createIndex({ created_at: -1 });

// Afficher les collections créées
print("Collections créées :");
db.getCollectionNames().forEach(function(col) {
    print("  - " + col);
});

print("\nIndex photos :");
db.photos.getIndexes().forEach(function(idx) {
    printjson(idx);
});

print("\nIndex faces :");
db.faces.getIndexes().forEach(function(idx) {
    printjson(idx);
});

print("\n✅ Base de données MongoDB initialisée avec succès !");
