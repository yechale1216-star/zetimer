"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Edit, Plus, Search, Upload, Download, AlertCircle, Users, CheckCircle2, Clock, ShieldCheck, Eye, X, Calendar, Mail, Phone, GraduationCap } from "lucide-react"
import { db, type Student } from "@/lib/db/database"
import { notifications } from "@/lib/utils/notifications"
import { ValidationService } from "@/lib/utils/validation"
import { authService } from "@/lib/auth/auth"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"


export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [gradeFilter, setGradeFilter] = useState("All Grades")
  const [streamFilter, setStreamFilter] = useState("All Streams")
  const [sectionFilter, setSectionFilter] = useState("All Sections")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [teacherAssignedClasses, setTeacherAssignedClasses] = useState<
    Array<{ grade: string; section: string; stream?: string }>
  >([])

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    student_id: "",
    grade: "",
    stream: "",
    section: "",
    parent_email: "",
    parent_phone: "+251",
    parent_name: "",
    parent_password: "",
    parent_address: "",
    relationshipType: "Guardian",
    existingParentId: "", // Added existingParentId
    gender: "",
    date_of_birth: "",
    address: "",
  })

  const [isSearchingParent, setIsSearchingParent] = useState(false)
  const [foundParent, setFoundParent] = useState<any>(null)
  const [linkExistingParent, setLinkExistingParent] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const { toast } = useToast()

  // Parent Search Trigger (Automatic)
  useEffect(() => {
    const cleanPhone = formData.parent_phone.replace(/\s+/g, '');
    if (cleanPhone.length >= 13 && cleanPhone.startsWith('+251')) {
      handleSearchParent();
    } else {
      setFoundParent(null);
      setLinkExistingParent(false);
    }
  }, [formData.parent_phone]);

  useEffect(() => {
    const user = authService.getCurrentUser()
    setIsTeacher(user?.role === "teacher")
    loadStudents()
  }, [])

  const filteredStudents = useMemo(() => {
    let filtered = students

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (student) =>
          student.name?.toLowerCase().includes(term) ||
          student.student_id?.toLowerCase().includes(term) ||
          student.grade?.toLowerCase().includes(term) ||
          student.stream?.toLowerCase().includes(term) ||
          student.section?.toLowerCase().includes(term),
      )
    }

    if (!isTeacher && gradeFilter !== "All Grades") {
      filtered = filtered.filter((student) => student.grade === gradeFilter)
    }

    if (!isTeacher && streamFilter !== "All Streams") {
      filtered = filtered.filter((student) => student.stream === streamFilter)
    }

    if (!isTeacher && sectionFilter !== "All Sections") {
      filtered = filtered.filter((student) => student.section === sectionFilter)
    }

    return [...filtered].sort((a, b) => {
      const nameA = a.name || ""
      const nameB = b.name || ""
      return nameA.localeCompare(nameB)
    })
  }, [students, searchTerm, gradeFilter, streamFilter, sectionFilter, isTeacher])

  const loadStudents = async () => {
    setIsLoading(true)
    try {
      const user = authService.getCurrentUser()
      const studentsData = await db.getStudents()
      
      if (user?.role === "teacher") {
        // Fetch teacher's assigned classes
        const assignmentsData = await db.getTeacherAssignments(user.schoolId, user.teacherId || user.id)
        const classes = assignmentsData || []
        setTeacherAssignedClasses(classes as any)

        // Filter students based on teacher's assigned classes
        const filtered = studentsData.filter((student: Student) =>
          classes.some((cls) => {
            const studentGrade = student.grade?.replace("Grade ", "").trim() || ""
            const classGrade = String(cls.grade || cls.class?.grade || "").trim()
            const gradeMatch = studentGrade === classGrade
            const sectionMatch = (cls.section || cls.class?.section) === student.section
            const streamMatch = !cls.stream || cls.stream === student.stream

            return gradeMatch && sectionMatch && streamMatch
          }),
        )

        setStudents(filtered)
      } else {
        setStudents(studentsData)
      }
    } catch (error) {
      console.error("[v0] Error loading students:", error)
      notifications.error("Error", "Failed to load students")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    const generatedId = Math.floor(100000 + Math.random() * 900000).toString();
    setFormData({
      name: "",
      student_id: generatedId,
      grade: "",
      stream: "",
      section: "",
      parent_email: "",
      parent_phone: "+251",
      parent_name: "",
      parent_password: "",
      parent_address: "",
      relationshipType: "Guardian",
      existingParentId: "",
      gender: "",
      date_of_birth: "",
      address: "",
    })
    setEditingStudent(null)
    setValidationErrors([])
    setFoundParent(null)
    setLinkExistingParent(false)
  }

  const validateForm = () => {
    const existingStudentIds = students.map((s) => s.student_id || "")
    const currentStudentId = editingStudent?.student_id

    const nameValidation = ValidationService.validateName(formData.name)
    const studentIdValidation = ValidationService.validateStudentId(
      formData.student_id,
      existingStudentIds,
      currentStudentId,
    )
    const gradeValidation = ValidationService.validateRequired(formData.grade, "Grade")
    const sectionValidation = ValidationService.validateRequired(formData.section, "Section")

    // If linking an existing parent, skip parent field validation
    const isLinkingExisting = Boolean(formData.existingParentId)
    const parentEmailValidation = isLinkingExisting
      ? { isValid: true, errors: [] }
      : ValidationService.validateEmail(formData.parent_email)
    const parentPhoneValidation = isLinkingExisting
      ? { isValid: true, errors: [] }
      : ValidationService.validatePhone(formData.parent_phone)
    const parentNameValidation = isLinkingExisting
      ? { isValid: true, errors: [] }
      : ValidationService.validateName(formData.parent_name)

    const combinedResult = ValidationService.combineValidationResults(
      nameValidation,
      studentIdValidation,
      gradeValidation,
      sectionValidation,
      parentEmailValidation,
      parentPhoneValidation,
      parentNameValidation,
    )

    setValidationErrors(combinedResult.errors)
    return combinedResult.isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSaving(true)

    try {
      if (editingStudent) {
        await db.updateStudent(editingStudent.id, formData)
        notifications.success("Student Updated Successfully", "The student information has been updated.")
        toast({
          title: "Student Updated Successfully",
          description: "The student information has been updated.",
        })
        await loadStudents()
        setIsAddModalOpen(false)
        resetForm()
      } else {
        await db.addStudent(formData)
        notifications.success("Student Enrolled Successfully", "New student has been added to the system.")
        toast({
          title: "Student Enrolled Successfully",
          description: "New student has been added to the system.",
        })
        await loadStudents()
        setShowSuccess(true)
        setTimeout(() => {
          setIsAddModalOpen(false)
          setShowSuccess(false)
          resetForm()
        }, 2500)
      }
    } catch (error) {
      notifications.error("Error", "Failed to save student")
      toast({
        title: "Error",
        description: "Failed to save student",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleGradeChange = (gradeValue: string) => {
    const gradeNum = parseInt(gradeValue.replace(/[^\d]/g, ""), 10);
    setFormData((prev) => {
      const updated = { ...prev, grade: gradeValue };
      if (isNaN(gradeNum) || gradeNum < 11) {
        updated.stream = "General";
      } else if (prev.stream === "General" || !prev.stream) {
        updated.stream = "";
      }
      return updated;
    });
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setFormData({
      name: student.name || "",
      student_id: student.student_id || "",
      grade: student.grade || "",
      stream: student.stream || "",
      section: student.section || "",
      parent_email: student.parent_email || "",
      parent_phone: student.parent_phone || "+251",
      parent_name: student.parent_name || "",
      parent_password: "",
      parent_address: student.parent_address || "",
      relationshipType: student.relationshipType || "Guardian",
      existingParentId: "",
      gender: student.gender || "",
      date_of_birth: student.date_of_birth || "",
      address: student.address || "",
    })
    setValidationErrors([])
    setFoundParent(null)
    setLinkExistingParent(false)
    setIsAddModalOpen(true)
  }

  const handleSearchParent = async () => {
    const cleanPhone = formData.parent_phone.replace(/\s+/g, "")
    if (cleanPhone.length < 13) return;
    
    // Prevent redundant searches if already found for this phone
    if (foundParent && foundParent.phone === cleanPhone) return;

    setIsSearchingParent(true);
    try {
      const res = await authService.searchParentByPhone(cleanPhone);
      if (res.success && res.data) {
        setFoundParent(res.data);
        setLinkExistingParent(true);
        // Pre-fill form data with found parent info
        setFormData(prev => ({
          ...prev,
          parent_name: res.data.full_name || prev.parent_name,
          parent_email: res.data.email || prev.parent_email,
          parent_address: res.data.address || prev.parent_address,
          existingParentId: res.data.id
        }));
      } else {
        setFoundParent(null);
        setLinkExistingParent(false);
        setFormData(prev => ({ ...prev, existingParentId: "" }));
      }
    } catch (err) {
      console.error("Parent search error:", err);
    } finally {
      setIsSearchingParent(false);
    }
  }

  const handleDelete = async (student: Student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
      try {
        await db.deleteStudent(student.id)
        notifications.success("Success", "Student deleted successfully")
        await loadStudents()
      } catch (error) {
        notifications.error("Error", "Failed to delete student")
      }
    }
  }

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileValidation = ValidationService.validateCSVFile(file)
    if (!fileValidation.isValid) {
      notifications.error("Invalid File", fileValidation.error || "Unknown error")
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string
        const lines = csv.split("\n").filter((line) => line.trim())

        if (lines.length < 2) {
          notifications.error("CSV Error", "CSV file must contain at least a header row and one data row")
          return
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

        const requiredHeaders = [
          "name",
          "student_id",
          "grade",
          "section",
          "parent_phone",
          "parent_name",
        ]
        const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))

        if (missingHeaders.length > 0) {
          notifications.error("CSV Error", `Missing required columns: ${missingHeaders.join(", ")}`)
          return
        }

        const studentsToImport = []
        const importErrors = []
        // For CSV import, we allow existing IDs because we support updates (upsert)
        // But we still track IDs within the same CSV to prevent duplicates in the file itself
        const studentIdsInCsv: string[] = []

        for (let i = 1; i < lines.length; i++) {
          const rawValues = lines[i].split(",").map((v) => v.trim())
          if (rawValues.length === 0 || (rawValues.length === 1 && rawValues[0] === "")) continue

          const values = headers.map((_, index) => rawValues[index] || "")

          const student: any = {}
          headers.forEach((header, index) => {
            student[header] = values[index] || ""
          })

          if (!student.name || !student.student_id || !student.grade) {
            importErrors.push(`Row ${i + 1}: Missing student name, ID, or grade`)
            continue
          }

          // Parent defaults
          if (!student.parent_name || student.parent_name.trim() === "") {
            student.parent_name = `Parent of ${student.name}`
          }
          
          let phone = student.parent_phone || ""
          phone = phone.replace(/[\s\-\(\)]/g, "")
          if (phone.startsWith("0")) {
            phone = "+251" + phone.substring(1)
          } else if (phone.startsWith("251") && !phone.startsWith("+")) {
            phone = "+" + phone
          } else if (!phone.startsWith("+") && phone.length > 0) {
            phone = "+251" + phone
          }
          if (phone.trim() === "" || phone === "+251") {
            phone = "+251900000000"
          }
          student.parent_phone = phone

          // Validate student (pass an empty array to validateStudentId to bypass existence check, 
          // but we use studentIdsInCsv to catch duplicates within the file)
          const nameValidation = ValidationService.validateName(student.name)
          const studentIdValidation = ValidationService.validateStudentId(student.student_id, studentIdsInCsv)
          const phoneValidation = ValidationService.validatePhone(student.parent_phone)
          
          const validationResult = ValidationService.combineValidationResults(
            nameValidation,
            studentIdValidation,
            phoneValidation
          )

          if (validationResult.isValid) {
            studentsToImport.push(student)
            studentIdsInCsv.push(student.student_id)
          } else {
            importErrors.push(`Row ${i + 1} (${student.name}): ${validationResult.errors.join(", ")}`)
          }
        }

        if (importErrors.length > 0) {
          notifications.warning("Import Warnings", `${importErrors.length} rows had errors and were skipped`)
          console.warn("Import errors:", importErrors)
        }

        if (studentsToImport.length === 0) {
          notifications.error("Import Failed", "No valid students found to import")
          return
        }

        const importResult = await db.bulkAddStudents(studentsToImport)

        if (importResult.success) {
          notifications.success(
            "Import Successful",
            `${importResult.data.created} students processed. ${importResult.data.errors.length} rows had issues.`,
          )
          if (importResult.data.errors.length > 0) {
            console.warn("Bulk import errors:", importResult.data.errors)
          }
        } else {
          notifications.error("Import Failed", importResult.message || "Failed to import students")
        }
        
        await loadStudents()
      } catch (error) {
        console.error("CSV Import Error:", error)
        notifications.error("Error", "Failed to import CSV file")
      }
    }
    reader.readAsText(file)

    // Reset file input
    event.target.value = ""
  }

  const downloadCSVTemplate = () => {
    console.log("[v0] Starting CSV template download...")

    try {
      const headers = [
        "name",
        "student_id",
        "grade",
        "stream",
        "section",
        "gender",
        "date_of_birth",
        "address",
        "parent_name",
        "parent_phone",
        "parent_email",
        "relationshipType",
        "parent_address",
        "parent_password"
      ]
      const example = [
        "John Doe",
        "S001",
        "Grade 10",
        "Natural",
        "A",
        "Male",
        "2009-05-15",
        "Addis Ababa, Bole",
        "Jane Doe",
        "+251911223344",
        "jane.doe@example.com",
        "Mother",
        "Addis Ababa, Bole",
        "password123"
      ]

      let csvContent = headers.join(",") + "\n"
      csvContent += example.join(",") + "\n"

      console.log("[v0] CSV template content generated")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)

      // Create download link
      const link = document.createElement("a")
      link.href = url
      link.download = "student_import_template.csv"
      link.style.display = "none"

      // Add to DOM, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL object
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)

      console.log("[v0] CSV template download initiated successfully")
      notifications.success("Template Downloaded", "CSV template downloaded successfully")
    } catch (error) {
      console.error("[v0] CSV template download error:", error)
      notifications.error("Download Failed", "Failed to download template. Please try again.")
    }
  }

  const exportStudentListToCSV = () => {
    console.log("[v0] Starting student list CSV export...")

    try {
      const headers = [
        "Student Name",
        "Student ID",
        "Grade",
        "Stream",
        "Section",
        "Gender",
        "Date of Birth",
        "Student Address",
        "Parent Name",
        "Parent Phone",
        "Parent Email",
        "Relationship",
        "Parent Address"
      ]

      const csvData = filteredStudents.map((student) => [
        `"${student.name}"`,
        student.student_id,
        `"${student.grade}"`,
        `"${student.stream || ""}"`,
        student.section,
        student.gender,
        student.date_of_birth || "",
        `"${student.address || ""}"`,
        `"${student.parent_name || ""}"`,
        student.parent_phone || "",
        student.parent_email || "",
        `"${student.relationshipType || "Guardian"}"`,
        `"${student.parent_address || ""}"`,
      ])

      const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `students_list_${new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })}.csv`
      link.style.display = "none"

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)

      notifications.success(
        "Export Successful",
        `${filteredStudents.length} students have been exported to CSV successfully.`,
      )
    } catch (error) {
      console.error("[v0] CSV export error:", error)
      notifications.error("Export Failed", "Failed to export student list. Please try again.")
    }
  }

  const { grades, streams, sections } = useMemo(() => {
    return {
      grades: [...new Set(students.map((s) => s.grade))].filter((g): g is string => !!g),
      streams: [...new Set(students.map((s) => s.stream))].filter((s): s is string => !!s),
      sections: [...new Set(students.map((s) => s.section))].filter((s): s is string => !!s),
    }
  }, [students])

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-slate-900/80 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Student Directory</h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Manage and monitor your school's student database
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            onClick={() => setShowUploadDialog(true)} 
            variant="outline"
            className="flex-1 md:flex-none h-11 rounded-xl border-border/50 bg-background/50 hover:bg-muted transition-all"
          >
            <Upload className="w-4 h-4 mr-2 text-primary" />
            Import CSV
          </Button>
          <Button 
            onClick={exportStudentListToCSV} 
            disabled={filteredStudents.length === 0}
            variant="outline"
            className="flex-1 md:flex-none h-11 rounded-xl border-border/50 bg-background/50 hover:bg-muted transition-all"
          >
            <Download className="w-4 h-4 mr-2 text-primary" />
            Export CSV
          </Button>
           <Dialog open={isAddModalOpen} onOpenChange={(open) => { if (!open) { setIsAddModalOpen(false); setShowSuccess(false) } }}>
             <Button 
               onClick={() => { resetForm(); setIsAddModalOpen(true); }} 
               className="flex-1 md:flex-none h-11 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
             >
               <Plus className="w-4 h-4 mr-2" />
               Add Student
             </Button>
             <DialogContent className="sm:max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl p-0 overflow-hidden">
              {showSuccess ? (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
                  <DialogTitle className="sr-only">Registration Successful</DialogTitle>
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce mb-5">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">Enrolled Successfully!</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">The student has been added to the system.</p>
                </div>
              ) : (
                <>
                  <DialogHeader className="bg-gradient-to-r from-emerald-50/60 to-teal-50/20 dark:from-slate-800/60 dark:to-slate-900/20 border-b border-slate-100 dark:border-slate-800/50 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-bold">{editingStudent ? "Update Student Profile" : "Enroll New Student"}</DialogTitle>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Provide complete personal and guardian contact fields.</p>
                      </div>
                    </div>
                  </DialogHeader>
                  
                  <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">
                    {validationErrors.length > 0 && (
                      <Alert variant="destructive" className="rounded-xl border-red-500/20 bg-red-500/10 mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                            {validationErrors.map((error, index) => (
                              <li key={index} className="font-medium">{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 space-y-4">
                        <p className="text-[10px] uppercase tracking-widest font-black text-emerald-600 dark:text-emerald-400">Basic Information</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
                            <Input
                              id="name"
                              placeholder="e.g. Abebe Bikila"
                              value={formData.name || ""}
                              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                              required
                              className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="student_id" className="text-sm font-medium">Student ID (Auto)</Label>
                            <Input
                              id="student_id"
                              value={formData.student_id || ""}
                              readOnly
                              className="h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70 cursor-not-allowed text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="grade" className="text-sm font-medium">Grade *</Label>
                            <Select
                              value={formData.grade}
                              onValueChange={handleGradeChange}
                            >
                              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 text-sm">
                                <SelectValue placeholder="Select Grade" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                                  <SelectItem key={g} value={`Grade ${g}`}>Grade {g}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="stream" className="text-sm font-medium">Stream</Label>
                            {!formData.grade ? (
                              <Input
                                id="stream"
                                placeholder="Select grade first"
                                readOnly
                                disabled
                                className="h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70 cursor-not-allowed text-sm"
                              />
                            ) : (
                              (() => {
                                const gradeNum = parseInt(formData.grade.replace(/[^\d]/g, ""), 10);
                                if (!isNaN(gradeNum) && gradeNum < 11) {
                                  return (
                                    <Input
                                      id="stream"
                                      value={formData.stream || "General"}
                                      readOnly
                                      className="h-11 rounded-xl bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70 cursor-not-allowed text-sm"
                                    />
                                  );
                                } else {
                                  return (
                                    <Select
                                      value={formData.stream}
                                      onValueChange={(value) => setFormData((prev) => ({ ...prev, stream: value }))}
                                    >
                                      <SelectTrigger className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 text-sm">
                                        <SelectValue placeholder="Select Stream" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                        <SelectItem value="Natural">Natural Science</SelectItem>
                                        <SelectItem value="Social">Social Science</SelectItem>
                                        <SelectItem value="General">General</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  );
                                }
                              })()
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="section" className="text-sm font-medium">Section *</Label>
                            <Input
                              id="section"
                              placeholder={formData.grade ? "e.g. A" : "Select grade first"}
                              value={formData.section || ""}
                              onChange={(e) => setFormData((prev) => ({ ...prev, section: e.target.value.toUpperCase() }))}
                              disabled={!formData.grade}
                              required
                              className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
                            <Select
                              value={formData.gender}
                              onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                            >
                              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 text-sm">
                                <SelectValue placeholder="Select Gender" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="date_of_birth" className="text-sm font-medium">Date of Birth</Label>
                            <Input
                              id="date_of_birth"
                              type="date"
                              value={formData.date_of_birth || ""}
                              onChange={(e) => setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                              className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase tracking-widest font-black text-emerald-600 dark:text-emerald-400">Parent/Guardian Contact</p>
                          {isSearchingParent && (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-pulse">
                              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
                              Checking parent directory...
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="parent_phone" className="text-sm font-bold text-slate-700 dark:text-slate-300">Parent Phone Number (Ethiopian) *</Label>
                            <div className="relative group">
                              <Input
                                id="parent_phone"
                                type="tel"
                                placeholder="+251 9XX XXX XXX"
                                maxLength={13}
                                value={formData.parent_phone || ""}
                                onChange={(e) => {
                                  let val = e.target.value.replace(/[^\d+]/g, "")
                                  if (val.lastIndexOf("+") > 0) val = "+" + val.replace(/\+/g, "")
                                  if (!val.startsWith("+251") && val.length > 0 && !val.startsWith("+")) val = "+251" + val
                                  setFormData((prev) => ({ ...prev, parent_phone: val }))
                                }}
                                required
                                className={`h-12 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-base font-medium ${foundParent ? 'border-emerald-500 bg-emerald-50/30' : ''}`}
                              />
                              {foundParent && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">Phone number is used for automatic account detection.</p>
                          </div>

                          {foundParent && !editingStudent ? (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl space-y-3 relative overflow-hidden animate-in fade-in slide-in-from-top-2">
                              <div className="flex items-center gap-2">
                                <span className="p-1 px-2 bg-emerald-600 text-white rounded text-[9px] font-black uppercase">Auto-Detected</span>
                                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200 italic">Existing Parent Found</h4>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-emerald-900/80 dark:text-emerald-100/80">
                                <p><span className="font-semibold text-emerald-800/60 dark:text-emerald-200/60">Name:</span> <strong>{foundParent.full_name}</strong></p>
                                <p><span className="font-semibold text-emerald-800/60 dark:text-emerald-200/60">Email:</span> <strong className="truncate block">{foundParent.email}</strong></p>
                                <p className="col-span-2"><span className="font-semibold text-emerald-800/60 dark:text-emerald-200/60">Address:</span> <strong>{foundParent.address || "No address provided"}</strong></p>
                              </div>
                              
                              <div className="space-y-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50">
                                <Label htmlFor="found_relationship" className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-tighter">Relationship to Student *</Label>
                                <Select
                                  value={formData.relationshipType}
                                  onValueChange={(value) => setFormData((prev) => ({ ...prev, relationshipType: value }))}
                                >
                                  <SelectTrigger id="found_relationship" className="h-10 rounded-lg bg-white/60 border-emerald-200 dark:border-emerald-800 text-sm font-medium">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg border-emerald-200 dark:border-emerald-800">
                                    <SelectItem value="Father">Father</SelectItem>
                                    <SelectItem value="Mother">Mother</SelectItem>
                                    <SelectItem value="Guardian">Guardian</SelectItem>
                                    <SelectItem value="Grandparent">Grandparent</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            !isSearchingParent && !editingStudent && formData.parent_phone.replace(/\s+/g, '').length >= 13 && (
                              <div className="space-y-4 animate-in slide-in-from-top-2 fade-in">
                                <div className="flex items-center gap-2">
                                  <span className="p-1 px-2 bg-amber-500 text-white rounded text-[9px] font-black uppercase">New Profile</span>
                                  <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 italic">Registering New Parent</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="parent_name" className="text-sm font-medium text-slate-600">Parent Full Name *</Label>
                                    <Input
                                      id="parent_name"
                                      placeholder="First and Father Name"
                                      value={formData.parent_name || ""}
                                      onChange={(e) => setFormData((prev) => ({ ...prev, parent_name: e.target.value }))}
                                      required
                                      className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="relationship" className="text-sm font-medium text-slate-600">Relationship *</Label>
                                    <Select
                                      value={formData.relationshipType}
                                      onValueChange={(value) => setFormData((prev) => ({ ...prev, relationshipType: value }))}
                                    >
                                      <SelectTrigger id="relationship" className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 text-sm">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                                        <SelectItem value="Father">Father</SelectItem>
                                        <SelectItem value="Mother">Mother</SelectItem>
                                        <SelectItem value="Guardian">Guardian</SelectItem>
                                        <SelectItem value="Grandparent">Grandparent</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="parent_email" className="text-sm font-medium text-slate-600">Email Address (Optional)</Label>
                                    <Input
                                      id="parent_email"
                                      type="email"
                                      placeholder="email@example.com"
                                      value={formData.parent_email || ""}
                                      onChange={(e) => setFormData((prev) => ({ ...prev, parent_email: e.target.value }))}
                                      className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="parent_password" className="text-sm font-medium text-slate-600">Portal Password *</Label>
                                    <Input
                                      id="parent_password"
                                      type="text"
                                      placeholder="Temporary password"
                                      value={formData.parent_password || ""}
                                      onChange={(e) => setFormData((prev) => ({ ...prev, parent_password: e.target.value }))}
                                      required={!editingStudent && !foundParent && formData.parent_phone.length >= 13}
                                      className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                    />
                                  </div>
                                  <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="parent_address" className="text-sm font-medium text-slate-600">Home Address (Optional)</Label>
                                    <Input
                                      id="parent_address"
                                      placeholder="Location details"
                                      value={formData.parent_address || ""}
                                      onChange={(e) => setFormData((prev) => ({ ...prev, parent_address: e.target.value }))}
                                      className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          )}

                          {editingStudent && (
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                               <p className="text-[10px] uppercase font-bold text-slate-400">Update Contact Info</p>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit_parent_name" className="text-sm font-medium text-slate-600">Parent Name</Label>
                                    <Input
                                      id="edit_parent_name"
                                      value={formData.parent_name || ""}
                                      onChange={(e) => setFormData((prev) => ({ ...prev, parent_name: e.target.value }))}
                                      className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit_relationship" className="text-sm font-medium text-slate-600">Relationship</Label>
                                    <Select
                                      value={formData.relationshipType}
                                      onValueChange={(value) => setFormData((prev) => ({ ...prev, relationshipType: value }))}
                                    >
                                      <SelectTrigger id="edit_relationship" className="h-11 rounded-xl bg-background/50 border-slate-200 dark:border-slate-800 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Father">Father</SelectItem>
                                        <SelectItem value="Mother">Mother</SelectItem>
                                        <SelectItem value="Guardian">Guardian</SelectItem>
                                        <SelectItem value="Grandparent">Grandparent</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                               </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-bold shadow-lg shadow-emerald-600/10 transition-all active:scale-[0.98]" disabled={isSaving}>
                        {isSaving ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-emerald-foreground border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </div>
                        ) : editingStudent ? "Update Student Profile" : "Enroll Student"}
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Import Section */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl bg-card/95 backdrop-blur-xl p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold">Import Student Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Label htmlFor="csv-upload" className="cursor-pointer group">
              <div className="border-2 border-dashed border-border/60 rounded-3xl p-10 text-center group-hover:border-primary/40 group-hover:bg-primary/[0.02] transition-all bg-muted/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-lg font-bold text-foreground">Click or Drag CSV File</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                    Supported columns: name, id, grade, stream, section, gender, dob, parent info
                  </p>
                  <div className="mt-6 flex justify-center gap-2">
                    <Badge variant="outline" className="bg-background/50 border-border/50 text-[10px] font-bold">MAX 5MB</Badge>
                    <Badge variant="outline" className="bg-background/50 border-border/50 text-[10px] font-bold">.CSV ONLY</Badge>
                  </div>
                </div>
              </div>
              <Input id="csv-upload" type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
            </Label>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 p-4 rounded-2xl bg-muted/30 border border-border/50">
                <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/70 mb-2">Need Help?</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Download our pre-formatted template to ensure your student data is imported correctly without errors.
                </p>
              </div>
              <Button variant="outline" onClick={downloadCSVTemplate} className="h-auto py-4 rounded-2xl border-border/50 bg-background/50 hover:bg-muted font-bold text-sm">
                <Download className="w-4 h-4 mr-2 text-primary" />
                Get Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters and Search Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm sticky top-4 z-30 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, ID, or class details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-xl bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
          />
        </div>

        {!isTeacher && (
          <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="h-12 w-[140px] rounded-xl bg-background/50 border-border/50 font-bold text-xs">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50">
                <SelectItem value="All Grades">All Grades</SelectItem>
                {grades.map((grade) => (
                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={streamFilter} onValueChange={setStreamFilter}>
              <SelectTrigger className="h-12 w-[140px] rounded-xl bg-background/50 border-border/50 font-bold text-xs">
                <SelectValue placeholder="Stream" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50">
                <SelectItem value="All Streams">All Streams</SelectItem>
                {streams.map((stream) => (
                  <SelectItem key={stream} value={stream}>{stream}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="h-12 w-[140px] rounded-xl bg-background/50 border-border/50 font-bold text-xs">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50">
                <SelectItem value="All Sections">All Sections</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section} value={section}>{section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="hidden lg:block h-8 w-[1px] bg-border/50 mx-2" />
        
        <div className="flex items-center gap-2 text-xs font-black text-muted-foreground/70 uppercase tracking-widest px-2 min-w-fit">
          <Users className="w-4 h-4 text-primary/60" />
          <span>{filteredStudents.length} Students</span>
        </div>
      </div>

      {/* Main List Area */}
      <div className="bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="relative">
              <div className="h-16 w-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
            <p className="text-muted-foreground font-bold tracking-tight">Syncing student database...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center border border-border/50">
              <Search className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-foreground">No students found</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium leading-relaxed">
                We couldn't find any students matching your search or filters. Try adjusting your criteria.
              </p>
            </div>
            <Button variant="outline" onClick={() => { setSearchTerm(""); setGradeFilter("All Grades"); setStreamFilter("All Streams"); setSectionFilter("All Sections"); }} className="rounded-xl border-border/50">
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Table View */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%]">Student Details</TableHead>
                  <TableHead className="w-[20%]">ID Number</TableHead>
                  <TableHead className="w-[25%]">Class / Section / Stream</TableHead>
                  <TableHead className="w-[10%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id} className="group hover:bg-primary/[0.02] transition-colors border-b border-slate-100 dark:border-slate-800/80">
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-black text-lg shadow-sm border border-primary/10 group-hover:scale-110 transition-transform">
                          {student.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground leading-none mb-1">{student.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-background/50 border-border/50 text-[9px] h-4 py-0 font-bold opacity-70">
                              {student.gender || 'N/A'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                        {student.student_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-foreground">{student.grade}</p>
                        <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest">
                          {student.section} {student.stream ? `• ${student.stream}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedStudent(student)}
                          className="h-9 w-9 rounded-xl hover:bg-blue-500/10 hover:text-blue-600 transition-all"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(student)}
                          className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(student)}
                          className="h-9 w-9 rounded-xl hover:bg-red-500/10 hover:text-red-600 transition-all text-muted-foreground"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Student Profile Detail modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200/50 dark:border-slate-900/50 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            {/* Elegant Header Banner */}
            <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                <div className="w-24 h-24 rounded-full bg-white text-emerald-800 font-extrabold text-3xl flex items-center justify-center shadow-lg ring-4 ring-white/30">
                  {selectedStudent.name?.charAt(0).toUpperCase()}
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <h2 className="text-2xl font-extrabold tracking-tight">{selectedStudent.name}</h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-white/20 text-white border border-white/20 rounded-full">
                      Student Record
                    </span>
                  </div>
                  <p className="text-white/80 text-sm flex items-center justify-center sm:justify-start gap-1">
                    <span className="font-semibold text-white/90">ID:</span>
                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">{selectedStudent.student_id}</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1 bg-white dark:bg-slate-950">
              {/* Professional Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center text-center">
                  <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1" />
                  <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Class</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedStudent.grade || "N/A"}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center text-center">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-1" />
                  <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Section</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedStudent.section || "N/A"} {selectedStudent.stream ? `(${selectedStudent.stream})` : ""}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-900 flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 mb-1" />
                  <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">Gender</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedStudent.gender || "N/A"}
                  </span>
                </div>
              </div>

              {/* Student Personal Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Student Details</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-900 border border-slate-100 dark:border-slate-900 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Date of Birth
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedStudent.date_of_birth || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Parent / Guardian Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Parent / Guardian Information</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-900 border border-slate-100 dark:border-slate-900 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/20">
                  <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      Parent / Guardian Name
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedStudent.parent_name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      Phone Number
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedStudent.parent_phone || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      Email Address
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{selectedStudent.parent_email || "No email added"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-950/80 border-t border-slate-150 dark:border-slate-900/80 px-6 py-4 flex justify-end">
              <Button 
                onClick={() => setSelectedStudent(null)}
                className="rounded-xl px-6 bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-sm"
              >
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
