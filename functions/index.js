/**
 * Firebase Cloud Functions for CivicConnect
 * 
 * Functions:
 * 1. autoCategorizationOnCreate - AI categorization on complaint creation
 * 2. slaEngineScheduled - SLA monitoring and escalation (every 5 min)
 * 3. statusChangeNotification - FCM notifications on status updates
 * 4. auditLoggingOnUpdate - Automatic audit trail
 * 5. duplicateDetectionOnCreate - Check for nearby duplicates
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { OpenAI } = require("openai");
const { geohashForLocation, geohashQueryBounds, distanceBetween } = require("geofire-common");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY,
});

// ========================
// CONSTANTS
// ========================
const CATEGORIES = {
  roads_footpaths: {
    name: "Roads & Footpaths",
    subcategories: ["Pothole", "Road damage", "Footpath broken", "Encroachment"],
    keywords: ["road", "pothole", "footpath", "pavement", "crack", "broken road"],
  },
  sanitation_waste: {
    name: "Sanitation & Waste",
    subcategories: ["Garbage not collected", "Overflowing bin", "Open defecation", "Dead animal"],
    keywords: ["garbage", "waste", "trash", "dump", "bin", "sanitation", "defecation"],
  },
  water_drainage: {
    name: "Water & Drainage",
    subcategories: ["Water supply failure", "Low pressure", "Waterlogging", "Broken pipe", "Sewage overflow"],
    keywords: ["water", "drain", "flood", "sewage", "pipe", "leak", "waterlog"],
  },
  electricity_lighting: {
    name: "Electricity & Lighting",
    subcategories: ["Streetlight not working", "Power outage", "Fallen wire", "Transformer issue"],
    keywords: ["light", "electric", "power", "wire", "transformer", "streetlight"],
  },
  parks_public_spaces: {
    name: "Parks & Public Spaces",
    subcategories: ["Broken equipment", "Encroachment", "Vandalism", "Overgrown vegetation"],
    keywords: ["park", "playground", "garden", "bench", "vandalism"],
  },
  stray_animals: {
    name: "Stray Animals",
    subcategories: ["Stray dogs", "Injured animal", "Animal menace"],
    keywords: ["dog", "animal", "stray", "cat", "monkey"],
  },
  noise_pollution: {
    name: "Noise & Pollution",
    subcategories: ["Noise complaint", "Air pollution", "Water body pollution"],
    keywords: ["noise", "pollution", "loud", "smoke", "dust"],
  },
  other: {
    name: "Other",
    subcategories: ["Other"],
    keywords: [],
  },
};

const SLA_RULES = {
  "Fallen wire": { ack_hours: 0.5, resolution_hours: 4, priority: "CRITICAL" },
  "Transformer issue": { ack_hours: 0.5, resolution_hours: 4, priority: "CRITICAL" },
  "Water supply failure": { ack_hours: 1, resolution_hours: 24, priority: "HIGH" },
  "Sewage overflow": { ack_hours: 1, resolution_hours: 48, priority: "HIGH" },
  "Power outage": { ack_hours: 1, resolution_hours: 24, priority: "HIGH" },
  "Broken pipe": { ack_hours: 1, resolution_hours: 48, priority: "HIGH" },
  "Pothole": { ack_hours: 2, resolution_hours: 72, priority: "MEDIUM" },
  "Road damage": { ack_hours: 2, resolution_hours: 72, priority: "MEDIUM" },
  "Garbage not collected": { ack_hours: 2, resolution_hours: 48, priority: "MEDIUM" },
  "Overflowing bin": { ack_hours: 2, resolution_hours: 48, priority: "MEDIUM" },
  "Streetlight not working": { ack_hours: 4, resolution_hours: 168, priority: "MEDIUM" },
  "default": { ack_hours: 4, resolution_hours: 336, priority: "LOW" },
};

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Fallback categorization using keyword matching
 */
function fallbackCategorize(text) {
  const textLower = text.toLowerCase();
  let bestCat = "other";
  let bestScore = 0;

  for (const [catKey, catData] of Object.entries(CATEGORIES)) {
    const score = catData.keywords.filter((kw) => textLower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCat = catKey;
    }
  }

  const category = CATEGORIES[bestCat];
  return {
    category: bestCat,
    subcategory: category.subcategories[0],
    confidence: Math.min(0.3 + bestScore * 0.15, 0.75),
    priority: SLA_RULES[category.subcategories[0]]?.priority || "LOW",
  };
}

/**
 * AI-powered categorization using OpenAI
 */
async function aiCategorize(text) {
  try {
    const prompt = `You are a civic issue categorization AI. Categorize this complaint into one of these categories:
${Object.entries(CATEGORIES).map(([key, val]) => `- ${key}: ${val.name} (subcategories: ${val.subcategories.join(", ")})`).join("\n")}

Complaint: "${text}"

Respond ONLY with valid JSON (no markdown):
{"category": "category_key", "subcategory": "subcategory_name", "confidence": 0.0-1.0, "priority": "LOW|MEDIUM|HIGH|CRITICAL"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 150,
    });

    const content = response.choices[0].message.content.trim();
    const result = JSON.parse(content);

    // Validate result
    if (!CATEGORIES[result.category]) {
      throw new Error("Invalid category");
    }

    return result;
  } catch (error) {
    console.error("AI categorization failed:", error);
    return fallbackCategorize(text);
  }
}

/**
 * Calculate SLA percentage
 */
function calculateSLAPercentage(createdAt, slaDeadline) {
  const now = new Date();
  const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const deadline = slaDeadline.toDate ? slaDeadline.toDate() : new Date(slaDeadline);

  const total = deadline - created;
  const elapsed = now - created;

  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

/**
 * Send FCM notification to user
 */
async function sendNotificationToUser(userId, title, body, data = {}) {
  try {
    // Get user's FCM token from Firestore
    const userDoc = await db.collection("users").doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log(`No FCM token for user ${userId}`);
      return;
    }

    const message = {
      notification: { title, body },
      data,
      token: fcmToken,
    };

    await messaging.send(message);
    console.log(`Notification sent to user ${userId}`);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

// ========================
// CLOUD FUNCTIONS
// ========================

/**
 * 1. AUTO CATEGORIZATION ON CREATE
 * Triggers when a new complaint is created
 * Uses AI to categorize if category is missing or confidence is low
 */
exports.autoCategorizationOnCreate = functions.firestore
  .document("complaints/{complaintId}")
  .onCreate(async (snap, context) => {
    const complaint = snap.data();
    const complaintId = context.params.complaintId;

    console.log(`Auto-categorization triggered for complaint ${complaintId}`);

    // Skip if already categorized with high confidence
    if (complaint.category && complaint.subcategory) {
      console.log("Complaint already categorized, skipping");
      return null;
    }

    try {
      // Combine title and description for better categorization
      const text = `${complaint.title}. ${complaint.description}`;

      // Get AI categorization
      const result = await aiCategorize(text);

      console.log(`AI categorization result:`, result);

      // Update complaint with AI categorization
      await snap.ref.update({
        category: result.category,
        subcategory: result.subcategory,
        aiConfidence: result.confidence,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Add audit log
      await db.collection("complaints").doc(complaintId).collection("auditLogs").add({
        action: "ai_categorized",
        actorId: "system",
        details: `AI categorized as ${result.category} - ${result.subcategory} (${(result.confidence * 100).toFixed(0)}% confidence)`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Complaint ${complaintId} categorized successfully`);
      return null;
    } catch (error) {
      console.error("Auto-categorization failed:", error);
      return null;
    }
  });

/**
 * 2. SLA ENGINE - SCHEDULED
 * Runs every 5 minutes to check SLA compliance and escalate
 */
exports.slaEngineScheduled = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
    console.log("SLA Engine: Starting scheduled check");

    try {
      // Get all open complaints
      const snapshot = await db
        .collection("complaints")
        .where("status", "in", ["submitted", "assigned", "in_progress"])
        .get();

      console.log(`SLA Engine: Checking ${snapshot.size} open complaints`);

      const batch = db.batch();
      let escalatedCount = 0;

      for (const doc of snapshot.docs) {
        const complaint = doc.data();
        const slaPercentage = calculateSLAPercentage(complaint.createdAt, complaint.slaDeadline);
        const currentLevel = complaint.escalationLevel || 0;

        let newLevel = currentLevel;

        // Escalation logic
        if (slaPercentage >= 100 && currentLevel < 4) {
          newLevel = 4; // Municipal Commissioner
        } else if (slaPercentage >= 75 && currentLevel < 3) {
          newLevel = 3; // Department Head
        } else if (slaPercentage >= 50 && currentLevel < 2) {
          newLevel = 2; // Ward Officer
        }

        if (newLevel > currentLevel) {
          const escalationLabels = {
            2: "Ward Officer",
            3: "Department Head",
            4: "Municipal Commissioner",
          };

          // Update complaint
          batch.update(doc.ref, {
            escalationLevel: newLevel,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Add audit log
          const auditRef = doc.ref.collection("auditLogs").doc();
          batch.set(auditRef, {
            action: "escalated",
            actorId: "system",
            details: `SLA at ${slaPercentage.toFixed(0)}% - Escalated to ${escalationLabels[newLevel]}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Send notification to complaint creator
          if (complaint.userId) {
            await sendNotificationToUser(
              complaint.userId,
              "Complaint Escalated",
              `Your complaint "${complaint.title}" has been escalated to ${escalationLabels[newLevel]}`,
              { complaintId: doc.id, type: "escalation" }
            );
          }

          escalatedCount++;
          console.log(`Escalated complaint ${doc.id} to level ${newLevel}`);
        }
      }

      await batch.commit();
      console.log(`SLA Engine: Escalated ${escalatedCount} complaints`);

      return null;
    } catch (error) {
      console.error("SLA Engine failed:", error);
      return null;
    }
  });

/**
 * 3. STATUS CHANGE NOTIFICATIONS
 * Triggers when complaint status is updated
 * Sends FCM notification to complaint creator
 */
exports.statusChangeNotification = functions.firestore
  .document("complaints/{complaintId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const complaintId = context.params.complaintId;

    // Check if status changed
    if (before.status === after.status) {
      return null;
    }

    console.log(`Status changed for complaint ${complaintId}: ${before.status} -> ${after.status}`);

    try {
      const statusLabels = {
        submitted: "Submitted",
        assigned: "Assigned",
        in_progress: "In Progress",
        resolved: "Resolved",
        closed: "Closed",
      };

      const title = "Complaint Status Updated";
      const body = `Your complaint "${after.title}" is now ${statusLabels[after.status]}`;

      // Send notification to complaint creator
      if (after.userId) {
        await sendNotificationToUser(
          after.userId,
          title,
          body,
          {
            complaintId,
            type: "status_change",
            newStatus: after.status,
          }
        );
      }

      // If assigned, notify the assigned officer
      if (after.status === "assigned" && after.assignedTo && after.assignedTo !== before.assignedTo) {
        await sendNotificationToUser(
          after.assignedTo,
          "New Complaint Assigned",
          `You have been assigned: "${after.title}"`,
          {
            complaintId,
            type: "assignment",
          }
        );
      }

      console.log(`Notification sent for complaint ${complaintId}`);
      return null;
    } catch (error) {
      console.error("Failed to send status change notification:", error);
      return null;
    }
  });

/**
 * 4. AUDIT LOGGING ON UPDATE
 * Automatically logs all changes to complaints
 */
exports.auditLoggingOnUpdate = functions.firestore
  .document("complaints/{complaintId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const complaintId = context.params.complaintId;

    try {
      const changes = [];

      // Track field changes
      const fieldsToTrack = ["status", "assignedTo", "category", "subcategory", "priority", "escalationLevel"];

      for (const field of fieldsToTrack) {
        if (before[field] !== after[field]) {
          changes.push({
            field,
            oldValue: before[field],
            newValue: after[field],
          });
        }
      }

      if (changes.length === 0) {
        return null;
      }

      // Create audit log entry
      const auditLog = {
        action: "updated",
        actorId: after.updatedBy || "system",
        changes,
        details: changes.map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(", "),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db
        .collection("complaints")
        .doc(complaintId)
        .collection("auditLogs")
        .add(auditLog);

      console.log(`Audit log created for complaint ${complaintId}`);
      return null;
    } catch (error) {
      console.error("Failed to create audit log:", error);
      return null;
    }
  });

/**
 * 5. DUPLICATE DETECTION ON CREATE
 * Checks for nearby complaints within 50 meters
 * Adds duplicates array to complaint document
 */
exports.duplicateDetectionOnCreate = functions.firestore
  .document("complaints/{complaintId}")
  .onCreate(async (snap, context) => {
    const complaint = snap.data();
    const complaintId = context.params.complaintId;

    console.log(`Duplicate detection triggered for complaint ${complaintId}`);

    try {
      const location = complaint.location;
      if (!location || !location.latitude || !location.longitude) {
        console.log("No location data, skipping duplicate detection");
        return null;
      }

      const lat = location.latitude;
      const lng = location.longitude;
      const radiusInM = 50; // 50 meters

      // Calculate geohash query bounds
      const bounds = geohashQueryBounds([lat, lng], radiusInM);
      const promises = [];

      for (const bound of bounds) {
        const q = db
          .collection("complaints")
          .where("category", "==", complaint.category)
          .where("status", "in", ["submitted", "assigned", "in_progress"])
          .orderBy("geohash")
          .startAt(bound[0])
          .endAt(bound[1]);

        promises.push(q.get());
      }

      const snapshots = await Promise.all(promises);
      const duplicates = [];

      for (const snapshot of snapshots) {
        for (const doc of snapshot.docs) {
          if (doc.id === complaintId) continue; // Skip self

          const data = doc.data();
          const docLocation = data.location;

          if (!docLocation) continue;

          // Calculate actual distance
          const distance = distanceBetween(
            [lat, lng],
            [docLocation.latitude, docLocation.longitude]
          );

          if (distance <= radiusInM / 1000) {
            // Convert to km
            duplicates.push({
              complaintId: doc.id,
              title: data.title,
              status: data.status,
              distance: Math.round(distance * 1000), // Convert to meters
              createdAt: data.createdAt,
            });
          }
        }
      }

      if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} potential duplicates for complaint ${complaintId}`);

        // Update complaint with duplicates info
        await snap.ref.update({
          duplicates: duplicates.slice(0, 5), // Limit to 5
          hasDuplicates: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Add audit log
        await db.collection("complaints").doc(complaintId).collection("auditLogs").add({
          action: "duplicate_detected",
          actorId: "system",
          details: `Found ${duplicates.length} similar complaints within 50m`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return null;
    } catch (error) {
      console.error("Duplicate detection failed:", error);
      return null;
    }
  });

/**
 * 6. ADD GEOHASH ON CREATE
 * Adds geohash to complaint for efficient geospatial queries
 */
exports.addGeohashOnCreate = functions.firestore
  .document("complaints/{complaintId}")
  .onCreate(async (snap, context) => {
    const complaint = snap.data();
    const location = complaint.location;

    if (!location || !location.latitude || !location.longitude) {
      return null;
    }

    try {
      const geohash = geohashForLocation([location.latitude, location.longitude]);

      await snap.ref.update({
        geohash,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Geohash added to complaint ${context.params.complaintId}`);
      return null;
    } catch (error) {
      console.error("Failed to add geohash:", error);
      return null;
    }
  });
