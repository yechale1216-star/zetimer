const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface ParentNotification {
  id: string;
  schoolId: string;
  studentId: string | null;
  type: "absent" | "late" | "announcement" | "emergency" | "warning";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  student?: {
    id: string;
    fullName: string;
  } | null;
}

export interface ParentPreferences {
  id?: string;
  parentPhone?: string;
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushAlerts: boolean;
}

class ParentDatabase {
  private getHeaders(): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("attendance_token") : null
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
    return headers
  }

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  async getNotifications(phone: string): Promise<ParentNotification[]> {
    try {
      const res = await fetch(`${API_URL}/api/parent/notifications/${encodeURIComponent(phone)}`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const result = await res.json();
      return result.data || [];
    } catch (error) {
      console.error("[parent-db] getNotifications error:", error);
      return [];
    }
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/parent/notifications/${id}/read`, {
        method: "PATCH",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (error) {
      console.error("[parent-db] markNotificationAsRead error:", error);
      return false;
    }
  }

  async deleteNotification(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/parent/notifications/${id}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (error) {
      console.error("[parent-db] deleteNotification error:", error);
      return false;
    }
  }

  async markAllNotificationsAsRead(phone: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/parent/notifications/read-all/${encodeURIComponent(phone)}`, {
        method: "PATCH",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (error) {
      console.error("[parent-db] markAllNotificationsAsRead error:", error);
      return false;
    }
  }

  // ─── PREFERENCES ──────────────────────────────────────────────────────────
  async getPreferences(phone: string): Promise<ParentPreferences | null> {
    try {
      const res = await fetch(`${API_URL}/api/parent/preferences/${encodeURIComponent(phone)}`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch preferences");
      const result = await res.json();
      return result.data || null;
    } catch (error) {
      console.error("[parent-db] getPreferences error:", error);
      return null;
    }
  }

  async updatePreferences(phone: string, data: Partial<ParentPreferences>): Promise<ParentPreferences | null> {
    try {
      const res = await fetch(`${API_URL}/api/parent/preferences/${encodeURIComponent(phone)}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      const result = await res.json();
      return result.data || null;
    } catch (error) {
      console.error("[parent-db] updatePreferences error:", error);
      return null;
    }
  }

  // ─── ANNOUNCEMENTS / TEST GENERATOR ───────────────────────────────────────
  async postAnnouncement(schoolId: string, data: { studentId?: string; type?: string; title: string; message: string }): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/parent/announcements`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch (error) {
      console.error("[parent-db] postAnnouncement error:", error);
      return false;
    }
  }
}

export const parentDb = new ParentDatabase();
export const parentDatabase = parentDb;
