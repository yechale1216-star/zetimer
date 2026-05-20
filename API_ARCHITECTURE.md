# Super Admin Dashboard - API & Architecture

## Component Architecture

```
/app/super-admin/page.tsx (Main Container)
├── Sidebar Navigation
│   ├── Brand Header
│   ├── Navigation Menu (5 tabs)
│   └── User Footer (Email + Logout)
│
└── Main Content Area (Tabbed)
    ├── Dashboard Component
    │   ├── Stats Cards
    │   ├── Users Distribution Chart
    │   └── Schools Overview
    │
    ├── Schools Component
    │   ├── Search Bar
    │   ├── Schools Table
    │   └── Action Buttons (View, Delete)
    │
    ├── Users Component
    │   ├── Search Bar
    │   ├── Role Filter Dropdown
    │   ├── Users Table
    │   └── Action Buttons (Lock, Delete)
    │
    ├── Audit Logs Component
    │   ├── Search Bar
    │   ├── Action Type Filter
    │   ├── Status Filter
    │   ├── Logs Table
    │   └── Auto-refresh (10s)
    │
    └── Settings Component
        ├── Maintenance Mode Toggle
        ├── Registration Toggle
        ├── Session Timeout Input
        ├── Login Attempts Input
        ├── Password Length Input
        ├── Notification Toggles
        └── Save Button
```

## Service Layer API

### `superAdminService`

#### Dashboard Methods

```typescript
async getAllSchools(): Promise<School[]>
// Returns all schools with metadata
// Data: { id, name, code, email, phone, address, ... }

async getAllUsers(): Promise<User[]>
// Returns all users with role and school info
// Data: { id, email, full_name, role, school_id, is_active, ... }

async getDashboardMetrics(): Promise<DashboardMetrics>
// Returns system-wide statistics
// Data: { totalSchools, totalUsers, totalStudents, ... }

async getUserDistribution(): Promise<UserDistribution>
// Returns users grouped by role
// Data: { super_admin: count, admin: count, teacher: count }
```

#### School Management Methods

```typescript
async deleteSchool(schoolId: string, superAdminId: string): Promise<boolean>
// Deletes a school and logs the action
// Returns: true if successful

async updateSchool(schoolId: string, data: Partial<School>, superAdminId: string): Promise<boolean>
// Updates school information
```

#### User Management Methods

```typescript
async deactivateUser(userId: string, superAdminId: string): Promise<boolean>
// Deactivates a user account
// Returns: true if successful

async activateUser(userId: string, superAdminId: string): Promise<boolean>
// Activates a user account
// Returns: true if successful

async deleteUser(userId: string, superAdminId: string): Promise<boolean>
// Deletes a user account
// Returns: true if successful
```

#### Settings Methods

```typescript
async getSystemSettings(): Promise<SystemSettings>
// Returns current system settings
// Data: { maintenanceMode, registrationEnabled, sessionTimeout, ... }

async updateSystemSettings(settings: SystemSettings, superAdminId: string): Promise<boolean>
// Updates system-wide settings
// Returns: true if successful
```

#### Audit Logging Methods

```typescript
function getAuditLogs(): AuditLog[]
// Returns all audit log entries
// Data: { id, action, actor, targetType, targetName, timestamp, status, ... }

function logAction(action: AuditLog, superAdminId: string): void
// Creates a new audit log entry
```

## Data Models

### School
```typescript
interface School {
  id: string
  name: string
  code: string
  email: string
  phone: string
  address: string
  adminCount: number
  teacherCount: number
  studentCount: number
  totalUsers: number
  created_at: string
}
```

### User
```typescript
interface User {
  id: string
  email: string
  full_name: string
  role: "super_admin" | "admin" | "teacher"
  school_id?: string
  schoolName?: string
  is_active: boolean
  created_at: string
}
```

### SystemSettings
```typescript
interface SystemSettings {
  maintenanceMode: boolean
  registrationEnabled: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  passwordMinLength: number
  enableEmailNotifications: boolean
  enableSMSNotifications: boolean
}
```

### AuditLog
```typescript
interface AuditLog {
  id: string
  action: string
  actor: string
  targetType: string
  targetName: string
  timestamp: Date
  status: "success" | "failure"
  errorMessage?: string
}
```

### DashboardMetrics
```typescript
interface DashboardMetrics {
  totalSchools: number
  totalUsers: number
  totalStudents: number
  totalAdmins: number
  totalTeachers: number
  activeUsers: number
  recentActions: AuditLog[]
}
```

## API Endpoints (Future REST API)

### Schools
```
GET    /api/super-admin/schools
POST   /api/super-admin/schools
PUT    /api/super-admin/schools/:id
DELETE /api/super-admin/schools/:id
```

### Users
```
GET    /api/super-admin/users
POST   /api/super-admin/users
PUT    /api/super-admin/users/:id
DELETE /api/super-admin/users/:id
PATCH  /api/super-admin/users/:id/status
```

### Audit Logs
```
GET    /api/super-admin/audit-logs
GET    /api/super-admin/audit-logs/:id
POST   /api/super-admin/audit-logs
```

### Settings
```
GET    /api/super-admin/settings
PUT    /api/super-admin/settings
GET    /api/super-admin/settings/:key
```

## Authentication Flow

```
1. User enters credentials at /login
2. System verifies role === "super_admin"
3. User data stored in localStorage['attendance_current_user']
4. User navigated to /super-admin
5. Page verifies super_admin role from localStorage
6. If not super_admin, redirect to /
7. Dashboard loads with superAdminId from user data
```

## Data Flow Diagram

```
User Action
    ↓
Component Handler
    ↓
superAdminService Method
    ↓
localStorage Read/Write
    ↓
Audit Log Entry Created
    ↓
Component State Updated
    ↓
UI Re-renders
```

## State Management

### Dashboard Component State
```typescript
const [metrics, setMetrics] = useState<DashboardMetrics>()
const [loading, setLoading] = useState(true)
const [lastUpdate, setLastUpdate] = useState<Date>()
```

### Schools Component State
```typescript
const [schools, setSchools] = useState<School[]>([])
const [loading, setLoading] = useState(true)
const [searchTerm, setSearchTerm] = useState("")
const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
const [showDeleteDialog, setShowDeleteDialog] = useState(false)
```

### Users Component State
```typescript
const [users, setUsers] = useState<User[]>([])
const [loading, setLoading] = useState(true)
const [searchTerm, setSearchTerm] = useState("")
const [roleFilter, setRoleFilter] = useState("all")
const [selectedUser, setSelectedUser] = useState<User | null>(null)
const [showDeleteDialog, setShowDeleteDialog] = useState(false)
const [showToggleDialog, setShowToggleDialog] = useState(false)
```

### Audit Logs Component State
```typescript
const [logs, setLogs] = useState<AuditLog[]>([])
const [loading, setLoading] = useState(true)
const [searchTerm, setSearchTerm] = useState("")
const [actionFilter, setActionFilter] = useState("all")
const [statusFilter, setStatusFilter] = useState("all")
```

### Settings Component State
```typescript
const [settings, setSettings] = useState<SystemSettings>()
const [loading, setLoading] = useState(true)
const [saving, setSaving] = useState(false)
const [saved, setSaved] = useState(false)
```

## Component Props

### SuperAdminDashboard
```typescript
interface DashboardProps {
  superAdminId: string
}
```

### SuperAdminSchools
```typescript
interface SchoolsProps {
  superAdminId: string
}
```

### SuperAdminUsers
```typescript
interface UsersProps {
  superAdminId: string
}
```

### SuperAdminAuditLogs
```typescript
interface AuditLogsProps {
  superAdminId: string
}
```

### SuperAdminSettings
```typescript
interface SettingsProps {
  superAdminId: string
}
```

## Error Handling

All components include error handling with console logging:

```typescript
try {
  // Operation
  const data = await superAdminService.operation()
} catch (error) {
  console.error("[v0] Error message:", error)
  // UI maintains current state or shows error message
}
```

## Performance Considerations

### Auto-refresh Intervals
- **Dashboard**: 30 seconds
- **Audit Logs**: 10 seconds
- **Others**: On-demand only

### Optimization Strategies
- Client-side filtering (search/filter)
- Efficient re-renders with React hooks
- Minimal state mutations
- Debounced search (if implemented)

## localStorage Keys

```
attendance_current_user          // Current logged-in user
local_storage_db                 // Main database (schools, users, etc.)
super_admin_audit_logs          // Audit log entries
system_settings                 // System configuration
```

## Security Measures

1. **Role Verification**: Super admin role checked on page load
2. **Audit Trail**: All actions logged with super_admin ID and timestamp
3. **Data Validation**: Input validation on all operations
4. **Confirmation Dialogs**: Destructive actions require confirmation
5. **Error Messages**: Generic error messages (no sensitive info leak)

## Future Enhancement Points

1. **API Integration**: Replace localStorage with REST API
2. **Real-time Updates**: WebSocket for live updates
3. **Advanced Analytics**: Custom date ranges and exports
4. **Bulk Operations**: Multi-select and bulk actions
5. **User Impersonation**: Super admin ability to login as user
6. **Custom Reports**: Advanced filtering and export options
7. **Notifications**: Real-time alerts for critical actions

---

**Architecture Version**: 1.0
**Last Updated**: May 2026
