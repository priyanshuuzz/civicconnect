// Firebase Service Layer - Replaces backend API calls
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  GeoPoint
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase";

// Debug: Verify imports
console.log("🔥 Firebase Service Layer Loaded");
console.log("✅ DB imported:", db ? "Success" : "ERROR: db is undefined");
console.log("✅ Storage imported:", storage ? "Success" : "ERROR: storage is undefined");

// ========================
// CATEGORIES TAXONOMY
// ========================
export const CATEGORIES = {
  roads_footpaths: {
    name: "Roads & Footpaths",
    subcategories: ["Pothole", "Road damage", "Footpath broken", "Encroachment"]
  },
  sanitation_waste: {
    name: "Sanitation & Waste",
    subcategories: ["Garbage not collected", "Overflowing bin", "Open defecation", "Dead animal"]
  },
  water_drainage: {
    name: "Water & Drainage",
    subcategories: ["Water supply failure", "Low pressure", "Waterlogging", "Broken pipe", "Sewage overflow"]
  },
  electricity_lighting: {
    name: "Electricity & Lighting",
    subcategories: ["Streetlight not working", "Power outage", "Fallen wire", "Transformer issue"]
  },
  parks_public_spaces: {
    name: "Parks & Public Spaces",
    subcategories: ["Broken equipment", "Encroachment", "Vandalism", "Overgrown vegetation"]
  },
  stray_animals: {
    name: "Stray Animals",
    subcategories: ["Stray dogs", "Injured animal", "Animal menace"]
  },
  noise_pollution: {
    name: "Noise & Pollution",
    subcategories: ["Noise complaint", "Air pollution", "Water body pollution"]
  },
  other: {
    name: "Other",
    subcategories: ["Other"]
  }
};

// SLA FRAMEWORK (hours)
export const SLA_RULES = {
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
  "default": { ack_hours: 4, resolution_hours: 336, priority: "LOW" }
};

// Helper: Get SLA for subcategory
export const getSLAForSubcategory = (subcategory) => {
  return SLA_RULES[subcategory] || SLA_RULES["default"];
};

// Helper: Calculate SLA deadline
export const calculateSLADeadline = (subcategory) => {
  const sla = getSLAForSubcategory(subcategory);
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + sla.resolution_hours);
  return deadline;
};

// Helper: Calculate SLA percentage
export const getSLAPercentage = (createdAt, slaDeadline) => {
  const now = new Date();
  const created = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
  const deadline = slaDeadline?.toDate ? slaDeadline.toDate() : new Date(slaDeadline);
  
  const total = (deadline - created);
  const elapsed = (now - created);
  
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
};

// ========================
// COMPLAINT OPERATIONS
// ========================

// Create a new complaint
export const createComplaint = async (complaintData, userId, userName) => {
  try {
    const sla = getSLAForSubcategory(complaintData.subcategory);
    const slaDeadline = calculateSLADeadline(complaintData.subcategory);
    
    const complaint = {
      title: complaintData.title,
      description: complaintData.description,
      category: complaintData.category,
      subcategory: complaintData.subcategory,
      location: new GeoPoint(complaintData.latitude, complaintData.longitude),
      address: complaintData.address || "",
      imageUrl: complaintData.imageUrl || "",
      status: "submitted",
      priority: sla.priority,
      slaDeadline: slaDeadline,
      escalationLevel: 0,
      assignedTo: null,
      assignedToName: null,
      userId: userId,
      userName: userName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      resolvedAt: null,
      reopenCount: 0
    };

    const docRef = await addDoc(collection(db, "complaints"), complaint);
    
    // Add audit log
    await addAuditLog(docRef.id, "created", userId, `Complaint created: ${complaintData.title}`);
    
    return { id: docRef.id, ...complaint };
  } catch (error) {
    console.error("Error creating complaint:", error);
    throw error;
  }
};

// Upload image to Firebase Storage
export const uploadComplaintImage = async (file, complaintId) => {
  try {
    const storageRef = ref(storage, `complaints/${complaintId}/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

// Get complaints with filters
export const getComplaints = async (filters = {}) => {
  try {
    let q = collection(db, "complaints");
    const constraints = [];

    if (filters.userId) {
      constraints.push(where("userId", "==", filters.userId));
    }
    if (filters.status) {
      constraints.push(where("status", "==", filters.status));
    }
    if (filters.category) {
      constraints.push(where("category", "==", filters.category));
    }
    if (filters.assignedTo) {
      constraints.push(where("assignedTo", "==", filters.assignedTo));
    }

    constraints.push(orderBy("createdAt", "desc"));
    
    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }

    q = query(q, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      ticket_id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || null,
      slaDeadline: doc.data().slaDeadline?.toDate?.()?.toISOString() || null,
    }));
  } catch (error) {
    console.error("Error getting complaints:", error);
    throw error;
  }
};

// Get single complaint by ID
export const getComplaintById = async (complaintId) => {
  try {
    const docRef = doc(db, "complaints", complaintId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error("Complaint not found");
    }
    
    return {
      ticket_id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: docSnap.data().updatedAt?.toDate?.()?.toISOString() || null,
      resolvedAt: docSnap.data().resolvedAt?.toDate?.()?.toISOString() || null,
      slaDeadline: docSnap.data().slaDeadline?.toDate?.()?.toISOString() || null,
    };
  } catch (error) {
    console.error("Error getting complaint:", error);
    throw error;
  }
};

// Update complaint status
export const updateComplaintStatus = async (complaintId, status, userId, note = "") => {
  try {
    const docRef = doc(db, "complaints", complaintId);
    const updates = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (status === "resolved") {
      updates.resolvedAt = serverTimestamp();
    }
    
    await updateDoc(docRef, updates);
    await addAuditLog(complaintId, `status_changed_to_${status}`, userId, note);
    
    return { success: true };
  } catch (error) {
    console.error("Error updating status:", error);
    throw error;
  }
};

// Assign complaint to officer
export const assignComplaint = async (complaintId, assignedTo, assignedToName, userId, note = "") => {
  try {
    const docRef = doc(db, "complaints", complaintId);
    await updateDoc(docRef, {
      assignedTo,
      assignedToName,
      status: "assigned",
      updatedAt: serverTimestamp()
    });
    
    await addAuditLog(complaintId, "assigned", userId, `Assigned to ${assignedToName}. ${note}`);
    
    return { success: true };
  } catch (error) {
    console.error("Error assigning complaint:", error);
    throw error;
  }
};

// ========================
// MESSAGES
// ========================

// Add message to complaint
export const addMessage = async (complaintId, userId, userName, userRole, text) => {
  try {
    const messageData = {
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      text,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "complaints", complaintId, "messages"), messageData);
    
    // Update complaint's updatedAt
    await updateDoc(doc(db, "complaints", complaintId), {
      updatedAt: serverTimestamp()
    });
    
    return { message_id: docRef.id, ...messageData };
  } catch (error) {
    console.error("Error adding message:", error);
    throw error;
  }
};

// Get messages for complaint (real-time)
export const subscribeToMessages = (complaintId, callback) => {
  const q = query(
    collection(db, "complaints", complaintId, "messages"),
    orderBy("createdAt", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      message_id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }));
    callback(messages);
  });
};

// ========================
// AUDIT LOGS
// ========================

// Add audit log
export const addAuditLog = async (complaintId, action, actorId, details = "") => {
  try {
    const logData = {
      action,
      actorId,
      details,
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, "complaints", complaintId, "auditLogs"), logData);
  } catch (error) {
    console.error("Error adding audit log:", error);
  }
};

// Get audit logs for complaint
export const getAuditLogs = async (complaintId) => {
  try {
    const q = query(
      collection(db, "complaints", complaintId, "auditLogs"),
      orderBy("createdAt", "asc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      log_id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }));
  } catch (error) {
    console.error("Error getting audit logs:", error);
    throw error;
  }
};

// ========================
// MAP / PUBLIC DATA
// ========================

// Get complaints for map (public, no auth required)
export const getMapComplaints = async (filters = {}) => {
  try {
    let q = collection(db, "complaints");
    const constraints = [where("status", "!=", "closed")];

    if (filters.category) {
      constraints.push(where("category", "==", filters.category));
    }
    if (filters.status) {
      constraints.push(where("status", "==", filters.status));
    }

    constraints.push(orderBy("status"));
    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(500));

    q = query(q, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ticket_id: doc.id,
        title: data.title,
        category: data.category,
        subcategory: data.subcategory,
        location: data.location,
        status: data.status,
        priority: data.priority,
        address: data.address,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        slaDeadline: data.slaDeadline?.toDate?.()?.toISOString() || null,
      };
    });
  } catch (error) {
    console.error("Error getting map complaints:", error);
    throw error;
  }
};

// ========================
// ADMIN / ANALYTICS
// ========================

// Get dashboard statistics
export const getDashboardStats = async () => {
  try {
    const complaintsRef = collection(db, "complaints");
    const snapshot = await getDocs(complaintsRef);
    
    const stats = {
      total_tickets: snapshot.size,
      by_status: {},
      by_category: {},
      by_priority: {},
      sla_breached: 0
    };
    
    const now = new Date();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Count by status
      stats.by_status[data.status] = (stats.by_status[data.status] || 0) + 1;
      
      // Count by category
      stats.by_category[data.category] = (stats.by_category[data.category] || 0) + 1;
      
      // Count by priority
      stats.by_priority[data.priority] = (stats.by_priority[data.priority] || 0) + 1;
      
      // Count SLA breached
      if (data.status !== "resolved" && data.status !== "closed") {
        const deadline = data.slaDeadline?.toDate?.() || new Date(data.slaDeadline);
        if (deadline < now) {
          stats.sla_breached++;
        }
      }
    });
    
    return stats;
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    throw error;
  }
};

// Get all users (admin only)
export const getUsers = async (roleFilter = null) => {
  try {
    let q = collection(db, "users");
    
    if (roleFilter) {
      q = query(q, where("role", "==", roleFilter));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      user_id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }));
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

// Update user role (admin only)
export const updateUserRole = async (userId, newRole) => {
  try {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, {
      role: newRole,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

// Real-time subscription to complaints
export const subscribeToComplaints = (filters, callback, errorCallback) => {
  console.log("🔥 subscribeToComplaints called with filters:", filters);
  
  try {
    let q = collection(db, "complaints");
    const constraints = [];

    if (filters.userId) {
      console.log("📌 Adding userId filter:", filters.userId);
      constraints.push(where("userId", "==", filters.userId));
    }
    if (filters.status) {
      console.log("📌 Adding status filter:", filters.status);
      constraints.push(where("status", "==", filters.status));
    }
    if (filters.category) {
      console.log("📌 Adding category filter:", filters.category);
      constraints.push(where("category", "==", filters.category));
    }

    constraints.push(orderBy("createdAt", "desc"));
    
    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }

    q = query(q, ...constraints);
    console.log("✅ Query created successfully");
    
    return onSnapshot(q, 
      (snapshot) => {
        console.log("📬 Snapshot received:", snapshot.size, "documents");
        const complaints = snapshot.docs.map(doc => ({
          ticket_id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
          resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || null,
          slaDeadline: doc.data().slaDeadline?.toDate?.()?.toISOString() || null,
        }));
        console.log("✅ Processed complaints:", complaints);
        callback(complaints);
      },
      (error) => {
        console.error("❌ Snapshot error:", error);
        if (errorCallback) {
          errorCallback(error);
        } else {
          // If no error callback, still call main callback with empty array
          callback([]);
        }
      }
    );
  } catch (error) {
    console.error("❌ Error in subscribeToComplaints:", error);
    if (errorCallback) {
      errorCallback(error);
    }
    // Return a dummy unsubscribe function
    return () => {};
  }
};
