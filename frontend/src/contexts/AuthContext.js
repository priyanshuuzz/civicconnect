import { createContext, useContext, useState, useEffect } from "react";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/firebase";
import { setupNotifications, areNotificationsEnabled } from "@/lib/notifications";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = {
            user_id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || userDoc.data().name,
            role: userDoc.data().role || "citizen",
            phone: userDoc.data().phone || "",
            picture: firebaseUser.photoURL || userDoc.data().picture || "",
            ...userDoc.data()
          };
          setUser(userData);
          setIsAuthenticated(true);

          // Setup FCM notifications if not already enabled
          if (!areNotificationsEnabled()) {
            // Wait a bit before prompting for notifications (better UX)
            setTimeout(() => {
              setupNotifications(firebaseUser.uid).catch(err => {
                console.error("Failed to setup notifications:", err);
              });
            }, 2000);
          }
        } else {
          // User exists in Auth but not in Firestore (shouldn't happen)
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async ({ name, email, password, phone = "", role = "citizen" }) => {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create user document in Firestore
      const userData = {
        name,
        email,
        phone,
        role,
        picture: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userData);

      return {
        user_id: firebaseUser.uid,
        email,
        name,
        role,
        phone,
        picture: ""
      };
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        return {
          user_id: firebaseUser.uid,
          email: firebaseUser.email,
          name: userDoc.data().name,
          role: userDoc.data().role,
          phone: userDoc.data().phone || "",
          picture: firebaseUser.photoURL || ""
        };
      }
      throw new Error("User data not found");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const googleAuth = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check if user exists in Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user document for first-time Google sign-in
        const userData = {
          name: firebaseUser.displayName || "",
          email: firebaseUser.email,
          phone: "",
          role: "citizen",
          picture: firebaseUser.photoURL || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(userDocRef, userData);
      }

      return {
        user_id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || userDoc.data()?.name || "",
        role: userDoc.data()?.role || "citizen",
        phone: userDoc.data()?.phone || "",
        picture: firebaseUser.photoURL || ""
      };
    } catch (error) {
      console.error("Google auth error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const checkAuth = async () => {
    // This is handled by onAuthStateChanged
    return user;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated, 
      login, 
      register, 
      googleAuth, 
      logout, 
      checkAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
