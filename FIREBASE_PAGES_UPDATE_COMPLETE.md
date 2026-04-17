# 🔥 Firebase Pages Migration - COMPLETE GUIDE

## ✅ Status: ReportIssuePage.js UPDATED

### What's Been Done

1. **ReportIssuePage.js** - ✅ COMPLETE
   - Removed `api` import
   - Added Firebase imports: `createComplaint`, `uploadComplaintImage`, `CATEGORIES`
   - Simplified photo upload (single photo instead of multiple)
   - Direct Firebase Storage upload
   - Real-time complaint creation
   - Removed AI categorization (can be added as Cloud Function later)
   - Removed duplicate detection (can be added as Cloud Function later)

---

## 📋 Remaining Pages to Update

### 2. CitizenDashboard.js
**Current**: Uses `api.get("/tickets")`  
**Update to**:
```javascript
import { subscribeToComplaints, getSLAPercentage } from "@/lib/firebaseService";

// Replace useEffect with real-time subscription
useEffect(() => {
  const filters = { userId: user.user_id };
  if (statusFilter !== "all") filters.status = statusFilter;
  
  const unsubscribe = subscribeToComplaints(filters, (complaints) => {
    // Add SLA percentage to each complaint
    const withSLA = complaints.map(c => ({
      ...c,
      sla_percentage: getSLAPercentage(c.createdAt, c.slaDeadline)
    }));
    setTickets(withSLA);
    setLoading(false);
  });
  
  return () => unsubscribe();
}, [statusFilter, user]);
```

### 3. TicketDetailPage.js
**Current**: Uses `api.get`, `api.post`, `api.patch`  
**Update to**:
```javascript
import { 
  getComplaintById, 
  subscribeToMessages, 
  addMessage, 
  updateComplaintStatus,
  getAuditLogs 
} from "@/lib/firebaseService";

// Fetch ticket
useEffect(() => {
  const fetchData = async () => {
    const complaint = await getComplaintById(id);
    setTicket(complaint);
    
    const logs = await getAuditLogs(id);
    setAuditLogs(logs);
    
    setLoading(false);
  };
  fetchData();
}, [id]);

// Subscribe to messages (real-time)
useEffect(() => {
  const unsubscribe = subscribeToMessages(id, (msgs) => {
    setMessages(msgs);
  });
  return () => unsubscribe();
}, [id]);

// Send message
const sendMessage = async () => {
  await addMessage(id, user.user_id, user.name, user.role, msgText);
  setMsgText("");
};

// Update status
const updateStatus = async () => {
  await updateComplaintStatus(id, newStatus, user.user_id, statusNote);
  toast.success("Status updated");
  // Refresh ticket
  const updated = await getComplaintById(id);
  setTicket(updated);
};
```

### 4. OfficerDashboard.js
**Current**: Uses `api.get`, `api.post`, `api.patch`  
**Update to**:
```javascript
import { 
  subscribeToComplaints, 
  getDashboardStats, 
  assignComplaint, 
  updateComplaintStatus,
  getUsers 
} from "@/lib/firebaseService";

// Real-time complaints
useEffect(() => {
  const filters = {};
  if (statusFilter !== "all") filters.status = statusFilter;
  
  const unsubscribe = subscribeToComplaints(filters, (complaints) => {
    setTickets(complaints);
  });
  
  return () => unsubscribe();
}, [statusFilter]);

// Fetch dashboard stats
useEffect(() => {
  const fetchStats = async () => {
    const stats = await getDashboardStats();
    setDashData(stats);
    
    if (user?.role === "admin") {
      const officersList = await getUsers("officer");
      setOfficers(officersList);
    }
  };
  fetchStats();
}, [user]);

// Assign ticket
const handleAssign = async () => {
  const officer = officers.find(o => o.user_id === selectedOfficer);
  await assignComplaint(selectedTicket, selectedOfficer, officer.name, user.user_id);
  toast.success("Assigned");
};

// Update status
const handleStatusChange = async (ticketId, newStatus) => {
  await updateComplaintStatus(ticketId, newStatus, user.user_id);
  toast.success("Updated");
};
```

### 5. AdminDashboard.js
**Current**: Uses `api.get`, `api.patch`  
**Update to**:
```javascript
import { getDashboardStats, getUsers, updateUserRole } from "@/lib/firebaseService";

// Fetch all data
useEffect(() => {
  const fetchAll = async () => {
    const [stats, allUsers] = await Promise.all([
      getDashboardStats(),
      getUsers()
    ]);
    setDashData(stats);
    setUsers(allUsers);
    setLoading(false);
  };
  fetchAll();
}, []);

// Update role
const handleRoleChange = async (userId, newRole) => {
  await updateUserRole(userId, newRole);
  toast.success("Role updated");
  setUsers(users.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
};
```

### 6. TransparencyMap.js
**Current**: Uses `api.get("/map/tickets")`  
**Update to**:
```javascript
import { getMapComplaints } from "@/lib/firebaseService";

// Fetch map data
useEffect(() => {
  const fetchTickets = async () => {
    setLoading(true);
    const params = {};
    if (categoryFilter !== "all") params.category = categoryFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    
    const complaints = await getMapComplaints(params);
    setTickets(complaints);
    setLoading(false);
  };
  fetchTickets();
}, [categoryFilter, statusFilter]);
```

---

## 🔧 Quick Update Script

For each remaining page, follow this pattern:

1. **Remove old imports**:
```javascript
// DELETE THIS
import api from "@/lib/api";
```

2. **Add Firebase imports**:
```javascript
// ADD THIS
import { 
  getComplaints,
  subscribeToComplaints,
  // ... other functions you need
} from "@/lib/firebaseService";
```

3. **Replace API calls**:
```javascript
// OLD
const res = await api.get("/tickets");
setTickets(res.data.tickets);

// NEW
const complaints = await getComplaints({ userId: user.user_id });
setTickets(complaints);
```

4. **Use real-time subscriptions where appropriate**:
```javascript
// For dashboards, use subscribeToComplaints
useEffect(() => {
  const unsubscribe = subscribeToComplaints(filters, (data) => {
    setTickets(data);
  });
  return () => unsubscribe();
}, [filters]);
```

---

## 🎯 Testing Checklist

After updating each page:

- [ ] **ReportIssuePage**: Create new complaint with photo
- [ ] **CitizenDashboard**: View my complaints, filter by status
- [ ] **TicketDetailPage**: View details, send message, update status
- [ ] **OfficerDashboard**: View all complaints, assign, update status
- [ ] **AdminDashboard**: View analytics, manage users
- [ ] **TransparencyMap**: View public map with filters

---

## 🚀 Final Steps

1. Update all 5 remaining pages
2. Remove `src/lib/api.js` (no longer needed)
3. Test all features end-to-end
4. Verify real-time updates work
5. Check Firebase Console for data

---

## 📊 Migration Progress

- [x] Firebase initialization
- [x] Authentication system
- [x] Firebase service layer
- [x] ReportIssuePage.js
- [ ] CitizenDashboard.js
- [ ] TicketDetailPage.js
- [ ] OfficerDashboard.js
- [ ] AdminDashboard.js
- [ ] TransparencyMap.js

**Status**: 1/6 pages complete (17%)

---

## 💡 Pro Tips

1. **Real-time is better**: Use `subscribeToComplaints` instead of `getComplaints` for dashboards
2. **Error handling**: Wrap Firebase calls in try-catch
3. **Loading states**: Set loading before async calls
4. **Cleanup**: Return unsubscribe functions in useEffect
5. **Toast notifications**: Use toast.success/error for user feedback

---

## 🆘 Common Issues

### "Permission denied"
**Solution**: Check Firestore security rules are deployed

### "Index required"
**Solution**: Click the link in error to create index automatically

### "Real-time not working"
**Solution**: Make sure you're returning the unsubscribe function

### "Photos not uploading"
**Solution**: Check Storage security rules allow authenticated writes

---

Would you like me to update the remaining 5 pages now?
