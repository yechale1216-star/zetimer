import { toast } from "sonner"
import type { Student } from "@/lib/db/database"
import { db } from "@/lib/db/database"
import { parseJsonResponse } from "@/lib/utils/parse-json-response"

export class NotificationService {
  async success(title: string, message: string, duration?: number): Promise<void> {
    toast.success(`${title}: ${message}`, {
      duration: duration || 4000,
      style: {
        backgroundColor: "#dcfce7",
        color: "#15803d",
        border: "2px solid #22c55e",
        fontWeight: "600",
        fontSize: "15px",
      },
    })
    console.log(`[Success] ${title}: ${message}`)
  }

  async error(title: string, message: string): Promise<void> {
    let displayMessage = message;
    
    // Try to parse if it's a raw JSON string from a fetch error
    if (message && (message.trim().startsWith('{') || message.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(message);
        displayMessage = parsed.message || parsed.error || message;
      } catch (e) {
        // Fallback to original message
      }
    }

    toast.error(`${title}: ${displayMessage}`, {
      duration: 5000,
      style: {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
      },
    })
    console.error(`[Error] ${title}: ${displayMessage}`)
  }

  async warning(title: string, message: string): Promise<void> {
    toast.warning(`${title}: ${message}`, {
      duration: 4000,
      style: {
        backgroundColor: "#fef3c7",
        color: "#78350f",
        border: "1px solid #fcd34d",
      },
    })
    console.warn(`[Warning] ${title}: ${message}`)
  }

  async info(title: string, message: string, duration?: number): Promise<void> {
    toast.info(`${title}: ${message}`, {
      duration: duration || 3000,
      style: {
        backgroundColor: "#dbeafe",
        color: "#1e40af",
        border: "1px solid #93c5fd",
      },
    })
    console.info(`[Info] ${title}: ${message}`)
  }

  async sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text: html, html }),
      })
      const data = await parseJsonResponse<{
        success?: boolean
        error?: string
      }>(response)
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || "Failed to send email" }
      }
      return { success: true }
    } catch (error) {
      console.error("Email send error:", error)
      return { success: false, error: "Email service error" }
    }
  }

  async sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      })
      const data = await parseJsonResponse<{
        success?: boolean
        error?: string
      }>(response)
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || "Failed to send SMS" }
      }
      return { success: true }
    } catch (error) {
      console.error("SMS send error:", error)
      return { success: false, error: "SMS service error" }
    }
  }
}

class EmailService {
  private setupRequiredCallback: (() => void) | null = null

  setSetupRequiredCallback(callback: () => void): void {
    this.setupRequiredCallback = callback
  }

  private triggerSetupRequired(): void {
    if (this.setupRequiredCallback) {
      this.setupRequiredCallback()
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text: html, html }),
      })
      const data = await parseJsonResponse<{
        success?: boolean
        error?: string
      }>(response)
      if (!response.ok || !data.success) {
        this.triggerSetupRequired()
        return { success: false, error: data.error || "Failed to send email" }
      }
      return { success: true }
    } catch (error) {
      console.error("Email send error:", error)
      this.triggerSetupRequired()
      return { success: false, error: "Email service error" }
    }
  }
}

class CombinedNotificationService {
  private emailService: EmailService

  constructor() {
    this.emailService = new EmailService()
  }

  async sendCombinedNotification(params: {
    to: string
    phone?: string
    subject: string
    message: string
    html: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const emailResult = await this.emailService.sendEmail(params.to, params.subject, params.html)
      return emailResult
    } catch (error) {
      console.error("Combined notification error:", error)
      return { success: false, error: "Failed to send notification" }
    }
  }

  async sendBulkNotifications(
    notifications: Array<{
      student: Student
      status: "absent" | "late" | "excused"
      note: string
    }>,
    options: { email: boolean; sms: boolean },
  ): Promise<{
    email: { success: number; failed: number }
    sms: { success: number; failed: number }
  }> {
    const results = {
      email: { success: 0, failed: 0 },
      sms: { success: 0, failed: 0 },
    }

    let schoolSettings: any = {}
    try {
      schoolSettings = await db.getSettings()
      console.log("[v0] School settings retrieved:", {
        schoolName: schoolSettings.schoolName,
        schoolPhone: schoolSettings.schoolPhone,
      })
    } catch (error) {
      console.error("Error getting school settings:", error)
    }

    const schoolName = schoolSettings?.schoolName || "Addiss Hiwot School"
    const schoolPhone = schoolSettings?.schoolPhone || "Contact school for more information"

    console.log("[v0] Using school info - Name:", schoolName, "Phone:", schoolPhone)

    for (const notification of notifications) {
      const { student, status, note } = notification

      const parentFirstName = student.parent_name?.split(" ")[0] || student.parent_name || "Parent"
      const studentFirstName = student.name?.split(" ")[0] || student.name

      const getSubjectAndContent = () => {
        const today = new Date().toLocaleDateString("en-ET", {
          timeZone: "Africa/Addis_Ababa",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })

        if (status === "excused") {
          return {
            subject: `${schoolName} - Excused Absence Confirmation: ${student.name}`,
            message: `Dear ${parentFirstName},

This is to confirm that your child, ${student.name}, in Grade ${student.grade}, has been marked as excused absent today.

Reason: ${note || "Not specified"}

If this information is incorrect, kindly contact the school office immediately.

School Phone: ${schoolPhone}

We appreciate your cooperation.

Sincerely,
${schoolName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 24px;">${schoolName} - Excused Absence Confirmation</h1>
                </div>
                <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                  <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">Dear ${parentFirstName},</p>
                  <p style="color: #374151; line-height: 1.6;">
                    This is to confirm that your child, <strong>${student.name}</strong>, in <strong>Grade ${student.grade}</strong>, has been marked as <strong style="color: #2563eb;">excused absent</strong> today.
                  </p>
                  ${note ? `<p style="color: #374151; line-height: 1.6; background-color: #dbeafe; padding: 12px; border-radius: 6px; border-left: 4px solid #2563eb;"><strong>Reason:</strong> ${note}</p>` : ""}
                  <p style="color: #374151; line-height: 1.6;">
                    If this information is incorrect, kindly contact the school office immediately.
                  </p>
                  <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="color: #1e40af; line-height: 1.8; margin: 0;"><strong>📞 School Phone: ${schoolPhone}</strong></p>
                  </div>
                  <p style="color: #374151; line-height: 1.6; margin-top: 20px;">We appreciate your cooperation.</p>
                  <p style="color: #374151; line-height: 1.6; margin-top: 20px;">Sincerely,<br><strong>${schoolName}</strong></p>
                </div>
              </div>
            `,
          }
        } else if (status === "absent") {
          return {
            subject: `${schoolName} - Absence Alert: ${student.name}`,
            message: `Dear ${parentFirstName},

This is to inform you that your child, ${student.name}, in Grade ${student.grade}, was marked as absent today (${today}).

${note ? `Note: ${note}` : ""}

If your child was absent due to illness or another valid reason, please contact the school office to provide an explanation.

School Phone: ${schoolPhone}

We appreciate your prompt attention to this matter.

Sincerely,
${schoolName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 24px;">${schoolName} - Absence Alert: ${student.name}</h1>
                </div>
                <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                  <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">Dear ${parentFirstName},</p>
                  <p style="color: #374151; line-height: 1.6;">
                    This is to inform you that your child, <strong>${student.name}</strong>, in <strong>Grade ${student.grade}</strong>, was marked as <strong style="color: #dc2626;">absent</strong> today (${today}).
                  </p>
                  ${note ? `<p style="color: #374151; line-height: 1.6; background-color: #fee2e2; padding: 12px; border-radius: 6px; border-left: 4px solid #dc2626;"><strong>Note:</strong> ${note}</p>` : ""}
                  <p style="color: #374151; line-height: 1.6;">
                    If your child was absent due to illness or another valid reason, please contact the school office to provide an explanation.
                  </p>
                  <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="color: #991b1b; line-height: 1.8; margin: 0;"><strong>📞 School Phone: ${schoolPhone}</strong></p>
                  </div>
                  <p style="color: #374151; line-height: 1.6; margin-top: 20px;">We appreciate your prompt attention to this matter.</p>
                  <p style="color: #374151; line-height: 1.6; margin-top: 20px;">Sincerely,<br><strong>${schoolName}</strong></p>
                </div>
              </div>
            `,
          }
        } else {
          // Late
          return {
            subject: `${schoolName} - Late Arrival Notice: ${student.name}`,
            message: `Dear ${parentFirstName},

This is to inform you that your child, ${student.name}, in Grade ${student.grade}, arrived late to school today (${today}).

${note ? `Note: ${note}` : ""}

Punctuality is important for your child's academic success. Please ensure timely arrival in the future.

School Phone: ${schoolPhone}

Thank you for your cooperation.

Sincerely,
${schoolName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #ca8a04; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                  <h1 style="margin: 0; font-size: 24px;">${schoolName} - Late Arrival Notice: ${student.name}</h1>
                </div>
                <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                  <p style="color: #374151; line-height: 1.6; margin: 0 0 15px 0;">Dear ${parentFirstName},</p>
                  <p style="color: #374151; line-height: 1.6;">
                    This is to inform you that your child, <strong>${student.name}</strong>, in <strong>Grade ${student.grade}</strong>, arrived <strong style="color: #ca8a04;">late</strong> to school today (${today}).
                  </p>
                  ${note ? `<p style="color: #374151; line-height: 1.6; background-color: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #ca8a04;"><strong>Note:</strong> ${note}</p>` : ""}
                  <p style="color: #374151; line-height: 1.6;">
                    Punctuality is important for your child's academic success. Please ensure timely arrival in the future.
                  </p>
                  <div style="background-color: #fffbeb; border-left: 4px solid #ca8a04; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="color: #78350f; line-height: 1.8; margin: 0;"><strong>📞 School Phone: ${schoolPhone}</strong></p>
                  </div>
                  <p style="color: #374151; line-height: 1.6; margin-top: 20px;">Thank you for your cooperation.</p>
                  <p style="color: #374151; line-height: 1.6; margin-top: 20px;">Sincerely,<br><strong>${schoolName}</strong></p>
                </div>
              </div>
            `,
          }
        }
      }

      const { subject, message, html } = getSubjectAndContent()

      // Send email if enabled and parent has email
      if (options.email && student.parent_email) {
        try {
          const emailResult = await this.emailService.sendEmail(student.parent_email, subject, html)
          if (emailResult.success) {
            results.email.success++
          } else {
            results.email.failed++
          }
        } catch {
          results.email.failed++
        }
      }

      // Send SMS if enabled and parent has phone
      if (options.sms && student.parent_phone) {
        try {
          const response = await fetch("/api/send-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: student.parent_phone, message }),
          })
          const data = await parseJsonResponse<{
            success?: boolean
            error?: string
          }>(response)
          if (response.ok && data.success) {
            results.sms.success++
          } else {
            results.sms.failed++
          }
        } catch {
          results.sms.failed++
        }
      }
    }

    return results
  }
}

export const emailService = new EmailService()
export const combinedNotificationService = new CombinedNotificationService()

export const notifications = new NotificationService()

