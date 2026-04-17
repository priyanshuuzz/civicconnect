# ⚡ CivicConnect Quick Start Guide

## 🎯 What You Need to Know

CivicConnect is now a **fully Firebase-powered** application. No backend server needed!

### Tech Stack
- **Frontend:** React 19 + Tailwind CSS + shadcn/ui
- **Authentication:** Firebase Auth (Email/Password + Google OAuth)
- **Database:** Cloud Firestore (real-time NoSQL)
- **Storage:** Firebase Storage (images)
- **Backend Logic:** Cloud Functions (serverless)
- **Notifications:** Firebase Cloud Messaging (FCM)

---

## 🚀 Quick Setup (5 Minutes)

### 1. Install Dependencies
```bash
cd civicconnect/frontend
npm install --legacy-peer-deps
```

### 2. Configure Firebase
The Firebase config is already in `frontend/src/firebase.js`. No changes needed for development!

### 3. Start Development Server
```bash
npm start
```

App will open at `http://localhost:3000`

### 4. Test Login
**Test Accounts:**
- Email: `citizen@test.com` / Password: `test123` (Citizen role)
- Email: `officer@test.com` / Password: `test123` (Officer role)
- Email: `admin@test.com` / Password: `test123` (Admin role)

*Note: Create these accounts via the Register page first*

---

## 📁 Project Structure

```
civicconnect/
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── contexts/          # React contexts (Auth)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/
│   │   │   ├── firebase.js           # Firebase initialization
│   │   │   ├── firebaseService.js    # All Firebase operations
│   │   │   └── notifications.js      # FCM push notifications
│   │   ├── pages/             # Page components
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── ReportIssuePage.js
│   │   │   ├── CitizenDashboard.js
│   │   │   ├── TicketDetailPage.js
│   │   │   ├── OfficerDashboard.js
│   │   │   ├── AdminDashboard.js
│   │   │   └── TransparencyMap.js
│   │   ├── firebase.js        # Firebase config
│   │   └── App.js             # Main app component
│   └── public/
│       └── firebase-messaging-sw.js  # Service worker for notifications
├── functions/                 # Cloud Functions
│   └── index.js              # 6 automated functions
├── firestore.rules           # Database security rules
├── firestore.indexes.json    # Database indexes
└── firebase.json             # Firebase configuration
```

---

## 🔥 Firebase Services Overview

### 1. Authentication (`AuthContext.js`)
```javascript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, login, logout, register, googleAuth } = useAuth();
  
  // user object contains:
  // - user_id
  // - email
  // - name
  // - role (citizen/officer/admin)
  // - phone
  // - picture
}
```

### 2. Firestore Operations (`firebaseService.js`)

#### Create Complaint
```javascript
import { createComplaint, uploadComplaintImage } from "@/lib/firebaseService";

// Upload image first
const imageUrl = await uploadComplaintImage(file, "temp-id");

// Create complaint
const complaint = await createComplaint({
  title: "Pothole on Main St",
  description: "Large pothole causing issues",
  category: "roads_footpaths",
  subcategory: "Pothole",
  latitude: 28.4089,
  longitude: 77.3178,
  address: "Main St, City",
  imageUrl: imageUrl
}, userId, userName);
```

#### Real-Time Subscriptions
```javascript
import { subscribeToComplaints } from "@/lib/firebaseService";

useEffect(() => {
  const unsubscribe = subscribeToComplaints(
    { userId: user.user_id, status: "submitted" },
    (complaints) => {
      setComplaints(complaints); // Updates in real-time!
    }
  );
  
  return () => unsubscribe(); // Cleanup
}, [user]);
```

#### Get Single Complaint
```javascript
import { getComplaintById } from "@/lib/firebaseService";

const complaint = await getComplaintById(complaintId);
```

#### Update Status
```javascript
import { updateComplaintStatus } from "@/lib/firebaseService";

await updateComplaintStatus(
  complaintId,
  "resolved",
  userId,
  "Issue fixed"
);
```

#### Send Message
```javascript
import { addMessage } from "@/lib/firebaseService";

await addMessage(
  complaintId,
  userId,
  userName,
  userRole,
  "Message text"
);
```

#### Real-Time Messages
```javascript
import { subscribeToMessages } from "@/lib/firebaseService";

useEffect(() => {
  const unsubscribe = subscribeToMessages(complaintId, (messages) => {
    setMessages(messages); // Updates in real-time!
  });
  
  return () => unsubscribe();
}, [complaintId]);
```

### 3. Push Notifications (`notifications.js`)
```javascript
import { setupNotifications, areNotificationsEnabled } from "@/lib/notifications";

// Setup notifications (called automatically on login)
await setupNotifications(userId);

// Check if enabled
const enabled = areNotificationsEnabled();
```

---

## 🎨 UI Components (shadcn/ui)

All UI components are in `frontend/src/components/ui/`

### Common Components
```javascript
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// Usage
<Button onClick={handleClick}>Click Me</Button>
<Badge variant="outline">New</Badge>
<Input placeholder="Enter text" />
toast.success("Success!");
toast.error("Error!");
```

---

## 🗄️ Firestore Data Model

### Collections

#### `users`
```javascript
{
  user_id: "abc123",           // Document ID (Firebase Auth UID)
  name: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  role: "citizen",             // citizen | officer | admin
  picture: "https://...",
  fcmTokens: ["token1", "token2"],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `complaints`
```javascript
{
  ticket_id: "xyz789",         // Document ID
  title: "Pothole on Main St",
  description: "Large pothole...",
  category: "roads_footpaths",
  subcategory: "Pothole",
  location: GeoPoint(28.4089, 77.3178),
  geohash: "tdr1y",           // For geospatial queries
  address: "Main St, City",
  imageUrl: "https://storage...",
  status: "submitted",         // submitted | assigned | in_progress | resolved | closed
  priority: "MEDIUM",          // CRITICAL | HIGH | MEDIUM | LOW
  slaDeadline: Timestamp,
  escalationLevel: 0,
  assignedTo: "userId",
  assignedToName: "Officer Name",
  userId: "abc123",
  userName: "John Doe",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  resolvedAt: Timestamp,
  reopenCount: 0
}
```

#### `complaints/{id}/messages`
```javascript
{
  message_id: "msg123",        // Document ID
  senderId: "abc123",
  senderName: "John Doe",
  senderRole: "citizen",
  text: "Message content",
  createdAt: Timestamp
}
```

#### `complaints/{id}/auditLogs`
```javascript
{
  log_id: "log123",            // Document ID
  action: "status_changed_to_resolved",
  actorId: "abc123",
  details: "Issue fixed",
  createdAt: Timestamp
}
```

---

## 🔐 Security Rules

### Role-Based Access
- **Citizen:** Can create complaints, view own complaints, send messages
- **Officer:** Can view all complaints, assign, update status
- **Admin:** Full access + user management

### Firestore Rules Summary
```javascript
// Users collection
- Read: Authenticated users
- Create: Anyone (for registration)
- Update: Self only (except role field)
- Role updates: Admin only

// Complaints collection
- Read: Public (for map)
- Create: Authenticated users
- Update: Role-based (officers can update status)
- Delete: Admin only

// Messages subcollection
- Read: Authenticated users
- Create: Authenticated users
- Update/Delete: Not allowed

// Audit logs subcollection
- Read: Authenticated users
- Create: System only (via Cloud Functions)
- Update/Delete: Not allowed
```

---

## ☁️ Cloud Functions

### 6 Automated Functions

1. **autoCategorizationOnCreate**
   - Trigger: When complaint is created
   - Action: Calls OpenAI API to categorize
   - Updates: `category` field

2. **slaEngineScheduled**
   - Trigger: Every 5 minutes (scheduled)
   - Action: Checks SLA deadlines
   - Updates: `escalationLevel`, sends alerts

3. **statusChangeNotification**
   - Trigger: When complaint status changes
   - Action: Sends FCM push notification
   - Notifies: Complaint creator

4. **auditLoggingOnUpdate**
   - Trigger: When complaint is updated
   - Action: Creates audit log entry
   - Stores: Previous and new state

5. **duplicateDetectionOnCreate**
   - Trigger: When complaint is created
   - Action: Checks for nearby complaints (50m radius)
   - Returns: Warning if duplicates found

6. **addGeohashOnCreate**
   - Trigger: When complaint is created
   - Action: Generates geohash from location
   - Updates: `geohash` field

---

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test with Firebase Emulator (Local)
```bash
firebase emulators:start
```

### Manual Testing Checklist
- [ ] Register new user
- [ ] Login with email/password
- [ ] Login with Google
- [ ] Report new issue with image
- [ ] View dashboard (real-time updates)
- [ ] Send message in ticket
- [ ] Update status (officer/admin)
- [ ] View transparency map
- [ ] Receive push notification

---

## 🐛 Common Issues & Solutions

### Issue: "Permission denied" in Firestore
**Solution:** Check Firestore security rules. User must be authenticated and have correct role.

### Issue: Images not uploading
**Solution:** Check Firebase Storage rules. Ensure user is authenticated.

### Issue: Real-time updates not working
**Solution:** Check if `onSnapshot` subscription is properly cleaned up in `useEffect`.

### Issue: Push notifications not working
**Solution:** 
1. Check VAPID key is configured in `notifications.js`
2. Verify notification permission granted
3. Check FCM token saved in Firestore

### Issue: Cloud Functions not executing
**Solution:**
1. Check Firebase Console → Functions for errors
2. Verify environment variables set
3. Check function logs

### Issue: "Module not found" errors
**Solution:** Run `npm install --legacy-peer-deps`

---

## 📚 Useful Commands

### Development
```bash
npm start              # Start dev server
npm run build          # Build for production
npm test               # Run tests
```

### Firebase
```bash
firebase login                          # Login to Firebase
firebase deploy --only firestore:rules  # Deploy security rules
firebase deploy --only functions        # Deploy Cloud Functions
firebase deploy --only hosting          # Deploy frontend
firebase emulators:start                # Start local emulators
```

### Debugging
```bash
# View Cloud Functions logs
firebase functions:log

# View specific function logs
firebase functions:log --only functionName

# View real-time logs
firebase functions:log --follow
```

---

## 🔗 Important Links

### Firebase Console
- Project: https://console.firebase.google.com/project/civicconnect-b8190
- Authentication: https://console.firebase.google.com/project/civicconnect-b8190/authentication
- Firestore: https://console.firebase.google.com/project/civicconnect-b8190/firestore
- Storage: https://console.firebase.google.com/project/civicconnect-b8190/storage
- Functions: https://console.firebase.google.com/project/civicconnect-b8190/functions
- Hosting: https://console.firebase.google.com/project/civicconnect-b8190/hosting

### Documentation
- Firebase Docs: https://firebase.google.com/docs
- React Docs: https://react.dev
- Tailwind CSS: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com

### Project Docs
- `FIREBASE_MIGRATION_COMPLETE.md` - Complete migration details
- `FINAL_MIGRATION_SUMMARY.md` - Executive summary
- `DEPLOYMENT_CHECKLIST.md` - Deployment guide
- `CLOUD_FUNCTIONS_DEPLOYMENT.md` - Cloud Functions guide

---

## 💡 Pro Tips

1. **Real-time subscriptions** - Always clean up with `return () => unsubscribe()` in `useEffect`
2. **Error handling** - Wrap Firebase calls in try-catch blocks
3. **Loading states** - Show loading indicators during async operations
4. **Offline support** - Firestore works offline automatically!
5. **Security** - Never expose API keys in client code (use environment variables)
6. **Performance** - Use pagination for large lists
7. **Testing** - Use Firebase Emulator Suite for local testing
8. **Monitoring** - Check Firebase Console regularly for errors

---

## 🎓 Learning Resources

### Firebase
- [Firebase Web Codelab](https://firebase.google.com/codelabs/firebase-web)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Cloud Functions Guide](https://firebase.google.com/docs/functions)

### React
- [React Hooks](https://react.dev/reference/react)
- [React Router](https://reactrouter.com/en/main)
- [React Context](https://react.dev/learn/passing-data-deeply-with-context)

### UI/UX
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Lucide Icons](https://lucide.dev)

---

## 🤝 Contributing

### Code Style
- Use functional components with hooks
- Follow existing naming conventions
- Add JSDoc comments for functions
- Use TypeScript types where possible
- Keep components small and focused

### Git Workflow
```bash
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
# Create pull request
```

---

## 📞 Need Help?

1. Check the documentation files in the project root
2. Review Firebase Console for errors
3. Check browser console for frontend errors
4. Review Cloud Functions logs
5. Ask in project chat/forum

---

**Happy Coding! 🚀**

*Last Updated: April 17, 2026*
