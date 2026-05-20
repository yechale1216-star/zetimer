"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StudentManagement } from "@/components/school/student-management"
// import { ClassManagement } from "@/components/class-management"
import { TeacherAssignmentManagement } from "@/components/school/teacher-assignment-management"
import { Users, BookOpen, Briefcase } from "lucide-react"

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState("students")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Administration Panel</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage students, classes, teachers, and system settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Students</span>
          </TabsTrigger>
          {/* <TabsTrigger value="classes" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Classes</span>
          </TabsTrigger> */}
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            <span className="hidden sm:inline">Assignments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <StudentManagement />
        </TabsContent>

        {/* <TabsContent value="classes">
          <ClassManagement />
        </TabsContent> */}

        <TabsContent value="assignments">
          <TeacherAssignmentManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
