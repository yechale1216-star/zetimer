'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  TrendingUp, 
  History, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  Users,
  Calendar,
  Undo2,
  MoreVertical,
  ChevronDown,
  ShieldCheck,
  Download,
  ChevronLeft,
  UserCheck,
  UserX,
  Layers,
  User,
  Box
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { notifications } from '@/lib/utils/notifications'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface PromotionCohort {
  id: string
  gradeId: string
  gradeName: string
  sectionId: string
  sectionName: string
  streamId: string | null
  streamName: string | null
  count: number
}

interface GradeStudent {
  id: string
  fullName: string
  student_id: string
  gender: string | null
  sectionId: string
  streamId: string | null
  section: { id: string; name: string }
  stream: { id: string; name: string } | null
}

interface Stream {
  id: string
  name: string
}

interface Grade {
  id: string
  name: string
}

interface PromotionHistory {
  id: string
  student: { fullName: string; student_id: string }
  academicYear: string
  fromGradeId: string
  fromSectionId: string
  toGradeId: string | null
  toSectionId: string | null
  toStreamId: string | null
  promotedAt: string
  promotedByUserId: string
  notes?: string
}

export default function StudentPromotionPage() {
  const [activeTab, setActiveTab] = useState("promote")
  const [cohorts, setCohorts] = useState<PromotionCohort[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [history, setHistory] = useState<PromotionHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitLoading, setIsSubmitLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [academicYear, setAcademicYear] = useState("2024/2025")
  
  // Promotion Mode
  const [promotionMode, setPromotionMode] = useState<'bulk' | 'selective'>('bulk')
  
  // Selection State
  const [selectedCohortIds, setSelectedCohortIds] = useState<Set<string>>(new Set())
  const [expandedCohortId, setExpandedCohortId] = useState<string | null>(null)
  const [cohortStudents, setCohortStudents] = useState<Record<string, GradeStudent[]>>({})
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, Set<string>>>({})
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const [loadingStudents, setLoadingStudents] = useState(false)
  
  // Rules state
  const [promotionRules, setPromotionRules] = useState<Record<string, { 
    gradeId: string | 'GRADUATE', 
    sectionName: string, 
    streamId?: string 
  }>>({})
  
  // Dialog states
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  
  const headers = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('attendance_token') : null
    const schoolId = typeof window !== 'undefined' ? localStorage.getItem('x-school-id') : null
    return {
      'Authorization': `Bearer ${token}`,
      'x-school-id': schoolId || '',
      'Content-Type': 'application/json'
    }
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [prevRes, histRes, streamRes, settingsRes, gradesRes] = await Promise.all([
        fetch(`${API_URL}/api/promotions/preview`, { headers: headers as any }),
        fetch(`${API_URL}/api/promotions/history`, { headers: headers as any }),
        fetch(`${API_URL}/api/schools/me/streams`, { headers: headers as any }),
        fetch(`${API_URL}/api/settings`, { headers: headers as any }),
        fetch(`${API_URL}/api/schools/me/grades`, { headers: headers as any })
      ])
      
      let cohortData: PromotionCohort[] = []
      if (prevRes.ok) {
        const result = await prevRes.json()
        cohortData = result.data || []
        setCohorts(cohortData)
      }

      if (settingsRes.ok) {
        const result = await settingsRes.json()
        if (result.data?.academic_year) {
          setAcademicYear(result.data.academic_year)
        }
      }

      if (streamRes.ok) {
        const result = await streamRes.json()
        setStreams(result.data || [])
      }

      let latestGrades = []
      if (gradesRes.ok) {
        const result = await gradesRes.json()
        latestGrades = result.data || []
        setGrades(latestGrades)
      }
      
      if (cohortData.length > 0) {
        const rules: Record<string, { gradeId: string | 'GRADUATE', sectionName: string, streamId?: string }> = {}
        
        // Auto-configure rules based on grade progression
        cohortData.forEach(cohort => {
          const cohortGradeNum = parseInt(cohort.gradeName?.replace(/[^\d]/g, '') || '0') || 0
          const targetGrade = latestGrades.find((g: any) => (parseInt(g.name?.replace(/[^\d]/g, '') || '0') || 0) === cohortGradeNum + 1)
          
          rules[cohort.id] = { 
            gradeId: targetGrade ? targetGrade.id : 'GRADUATE', 
            sectionName: '' 
          }
        })
        setPromotionRules(rules)
      }
      
      if (histRes.ok) {
        const result = await histRes.json()
        setHistory(result.data || [])
      }
    } catch (error) {
      console.error("Failed to load promotion data:", error)
      notifications.error("Error", "Could not load promotion data")
    } finally {
      setIsLoading(false)
    }
  }

  // Define gradesData to avoid errors in rule auto-generation
  const gradesData = useMemo(() => grades, [grades])

  useEffect(() => {
    loadData()
  }, [])

  // Fetch students for a specific cohort
  const loadStudentsForCohort = async (cohort: PromotionCohort) => {
    if (cohortStudents[cohort.id]) return // Already cached
    setLoadingStudents(true)
    try {
      const query = new URLSearchParams({
        sectionId: cohort.sectionId,
        streamId: cohort.streamId || 'none'
      })
      const res = await fetch(`${API_URL}/api/promotions/preview/${cohort.gradeId}/students?${query.toString()}`, { headers: headers as any })
      if (res.ok) {
        const result = await res.json()
        const students: GradeStudent[] = result.data || []
        setCohortStudents(prev => ({ ...prev, [cohort.id]: students }))
        // Auto-select all students
        setSelectedStudentIds(prev => ({
          ...prev,
          [cohort.id]: new Set(students.map(s => s.id))
        }))
      }
    } catch (error) {
      console.error("Failed to load students:", error)
      notifications.error("Error", "Could not load student list")
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleCohortClick = async (cohort: PromotionCohort) => {
    if (promotionMode === 'bulk') {
      setSelectedCohortIds(prev => {
        const next = new Set(prev)
        if (next.has(cohort.id)) {
          next.delete(cohort.id)
        } else {
          next.add(cohort.id)
        }
        return next
      })
    } else {
      if (expandedCohortId === cohort.id) {
        setExpandedCohortId(null)
        return
      }
      setExpandedCohortId(cohort.id)
      setStudentSearchTerm("")
      await loadStudentsForCohort(cohort)
    }
  }

  const toggleStudentSelection = (cohortId: string, studentId: string) => {
    setSelectedStudentIds(prev => {
      const current = new Set(prev[cohortId] || [])
      if (current.has(studentId)) {
        current.delete(studentId)
      } else {
        current.add(studentId)
      }
      return { ...prev, [cohortId]: current }
    })
  }

  const toggleSelectAll = (cohortId: string) => {
    const students = cohortStudents[cohortId] || []
    const currentSelected = selectedStudentIds[cohortId] || new Set()
    
    if (currentSelected.size === students.length) {
      // Deselect all
      setSelectedStudentIds(prev => ({ ...prev, [cohortId]: new Set() }))
    } else {
      // Select all
      setSelectedStudentIds(prev => ({
        ...prev,
        [cohortId]: new Set(students.map(s => s.id))
      }))
    }
  }

  // Selections summary
  const totalSelectedInSelective = useMemo(() => {
    let total = 0
    for (const id in selectedStudentIds) {
      total += selectedStudentIds[id].size
    }
    return total
  }, [selectedStudentIds])

  const totalSelectedInBulk = useMemo(() => {
    let total = 0
    selectedCohortIds.forEach(id => {
      const cohort = cohorts.find(c => c.id === id)
      if (cohort) total += cohort.count
    })
    return total
  }, [selectedCohortIds, cohorts])

  const activeCohortIds = useMemo(() => {
    if (promotionMode === 'bulk') {
      return Array.from(selectedCohortIds)
    } else {
      return Object.keys(selectedStudentIds).filter(id => selectedStudentIds[id].size > 0)
    }
  }, [promotionMode, selectedCohortIds, selectedStudentIds])

  const isConfigurationComplete = useMemo(() => {
    if (activeCohortIds.length === 0) return false
    
    for (const cohortId of activeCohortIds) {
      const rule = promotionRules[cohortId]
      if (!rule) return false
      
      const targetGrade = grades.find(g => g.id === rule.gradeId)
      if (targetGrade?.name === '11' && !rule.streamId) {
        return false
      }
    }
    return true
  }, [activeCohortIds, promotionRules, grades])

  const executePromotion = async () => {
    if (activeCohortIds.length === 0) return
    if (!isConfigurationComplete) return
    
    setIsSubmitLoading(true)
    try {
      for (const cohortId of activeCohortIds) {
        const rule = promotionRules[cohortId]
        if (!rule) continue

        const cohort = cohorts.find(c => c.id === cohortId)
        if (!cohort) continue

        const payload: any = {
          academicYear,
          toGradeId: rule.gradeId === 'GRADUATE' ? 'GRADUATE' : rule.gradeId,
          toSectionName: rule.sectionName || null,
          toStreamId: rule.streamId || null,
        }

        if (promotionMode === 'bulk') {
          payload.gradeId = cohort.gradeId
          payload.sectionId = cohort.sectionId
          payload.streamId = cohort.streamId || 'none'
          payload.notes = `Bulk promotion of cohort: Grade ${cohort.gradeName} ${cohort.streamName ? cohort.streamName + ' ' : ''}Section ${cohort.sectionName}`
        } else {
          const studentIds = Array.from(selectedStudentIds[cohortId] || [])
          if (studentIds.length === 0) continue
          payload.studentIds = studentIds
          payload.notes = `Selective promotion: ${studentIds.length} students from cohort ${cohort.gradeName} ${cohort.streamName ? cohort.streamName + ' ' : ''}Section ${cohort.sectionName}`
        }

        const res = await fetch(`${API_URL}/api/promotions/promote`, {
          method: 'POST',
          headers: headers as any,
          body: JSON.stringify(payload)
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || `Failed to promote cohort ${cohortId}`)
        }
      }
      
      notifications.success("Success", "Students promoted successfully")
      setIsPreviewDialogOpen(false)
      setExpandedCohortId(null)
      setSelectedStudentIds({})
      setSelectedCohortIds(new Set())
      setCohortStudents({})
      loadData()
    } catch (error: any) {
      notifications.error("Promotion Failed", error.message)
    } finally {
      setIsSubmitLoading(false)
    }
  }

  const handleRollback = async (id: string) => {
    if (!confirm("Are you sure you want to rollback this promotion? The student will be returned to their previous grade/section.")) return

    try {
      const res = await fetch(`${API_URL}/api/promotions/rollback/${id}`, {
        method: 'POST',
        headers: headers as any
      })
      if (res.ok) {
        notifications.success("Success", "Promotion rolled back successfully")
        loadData()
      } else {
        const err = await res.json()
        throw new Error(err.error || "Rollback failed")
      }
    } catch (error: any) {
      notifications.error("Error", error.message)
    }
  }

  const filteredCohorts = cohorts.filter(c => 
    (c.gradeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.sectionName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.streamName && c.streamName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const expandedCohort = expandedCohortId ? cohorts.find(c => c.id === expandedCohortId) : null
  const expandedStudents = expandedCohortId ? (cohortStudents[expandedCohortId] || []) : []
  const filteredStudents = expandedStudents.filter(s =>
    s.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    s.student_id.toLowerCase().includes(studentSearchTerm.toLowerCase())
  )
  const selectedCountForExpanded = expandedCohortId ? (selectedStudentIds[expandedCohortId]?.size || 0) : 0

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            Student Promotion
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Granular cohort-based advancement with individual student control.
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-2 w-full md:w-[300px]">
            <TabsTrigger value="promote" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Promote
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "promote" ? (
          <motion.div
            key="promote"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Promotion Type Toggle */}
            <div className="flex justify-center">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex gap-1 shadow-inner border border-slate-200 dark:border-slate-700">
                <Button
                  variant={promotionMode === 'bulk' ? 'default' : 'ghost'}
                  onClick={() => {
                    setPromotionMode('bulk')
                    setExpandedCohortId(null)
                  }}
                  className={`rounded-xl px-6 gap-2 ${promotionMode === 'bulk' ? 'shadow-md shadow-primary/20' : ''}`}
                >
                  <Layers className="w-4 h-4" />
                  Bulk Cohorts
                </Button>
                <Button
                  variant={promotionMode === 'selective' ? 'default' : 'ghost'}
                  onClick={() => setPromotionMode('selective')}
                  className={`rounded-xl px-6 gap-2 ${promotionMode === 'selective' ? 'shadow-md shadow-primary/20' : ''}`}
                >
                  <UserCheck className="w-4 h-4" />
                  Individual Pick
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Panel */}
              <Card className="lg:col-span-3 border-none shadow-premium bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                <AnimatePresence mode="wait">
                  {!expandedCohortId ? (
                    <motion.div key="cohorts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                          <CardTitle className="text-xl">Available Cohorts</CardTitle>
                          <CardDescription>
                            Each card represents a unique Grade, Section, and Stream combination.
                          </CardDescription>
                        </div>
                        <div className="relative w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="Filter cohorts..." 
                            className="pl-9 bg-slate-50/50 dark:bg-slate-950/50 border-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {isLoading ? (
                            Array(6).fill(0).map((_, i) => (
                              <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
                            ))
                          ) : filteredCohorts.map((cohort) => {
                            const isSelected = promotionMode === 'bulk' 
                              ? selectedCohortIds.has(cohort.id)
                              : (selectedStudentIds[cohort.id]?.size || 0) > 0
                            
                            return (
                              <Card 
                                key={cohort.id} 
                                className={`relative overflow-hidden group cursor-pointer transition-all duration-300 transform hover:scale-[1.02] border-border/50 bg-white dark:bg-slate-950 ${isSelected ? 'ring-2 ring-primary border-primary shadow-lg shadow-primary/10' : 'hover:ring-2 hover:ring-primary/20'}`}
                                onClick={() => handleCohortClick(cohort)}
                              >
                                <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`} />
                                <CardHeader className="p-4 flex flex-col space-y-2 relative">
                                  <div className="flex items-center justify-between">
                                    <Badge variant="outline" className={`transition-colors font-bold ${isSelected ? 'bg-primary text-white border-primary' : 'bg-primary/5 text-primary border-primary/20'}`}>
                                      Grade {cohort.gradeName}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                      {isSelected && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                          <CheckCircle2 className="w-5 h-5 text-primary" />
                                        </motion.div>
                                      )}
                                      {promotionMode === 'selective' && (
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col">
                                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">
                                      Section {cohort.sectionName}
                                    </h3>
                                    {cohort.streamName && (
                                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                        <ShieldCheck className="w-3 h-3" /> {cohort.streamName}
                                      </span>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-3 relative">
                                  <div className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">
                                    <Users className="w-5 h-5 text-muted-foreground" />
                                    {cohort.count}
                                    <span className="text-xs font-medium text-muted-foreground ml-1">Students</span>
                                  </div>
                                  {promotionMode === 'selective' && isSelected && (
                                    <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] uppercase font-black tracking-tighter">
                                       {selectedStudentIds[cohort.id]?.size} selected
                                    </Badge>
                                  )}
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      </CardContent>
                    </motion.div>
                  ) : (
                    <motion.div key="students" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setExpandedCohortId(null)}>
                              <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <div>
                              <CardTitle className="text-xl flex items-center gap-2">
                                {expandedCohort?.gradeName} {expandedCohort?.streamName ? '- ' + expandedCohort.streamName : ''} (Sec {expandedCohort?.sectionName})
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {selectedCountForExpanded} / {expandedStudents.length} selected
                                </Badge>
                              </CardTitle>
                              <CardDescription>Select individuals for promotion from this specific cohort.</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="relative w-56">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input 
                                placeholder="Search students..." 
                                className="pl-9 bg-slate-50/50 dark:bg-slate-950/50 border-none h-9 text-sm"
                                value={studentSearchTerm}
                                onChange={(e) => setStudentSearchTerm(e.target.value)}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 text-xs"
                              onClick={() => toggleSelectAll(expandedCohortId!)}
                            >
                              {selectedCountForExpanded === expandedStudents.length ? (
                                <><UserX className="w-3.5 h-3.5" /> Deselect All</>
                              ) : (
                                <><UserCheck className="w-3.5 h-3.5" /> Select All</>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loadingStudents ? (
                          <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Loading students...
                          </div>
                        ) : (
                          <ScrollArea className="h-[450px]">
                            <div className="rounded-2xl border border-border/50 overflow-hidden shadow-sm bg-white dark:bg-slate-950">
                              <Table>
                                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 font-black tracking-tight uppercase text-[10px]">
                                  <TableRow className="border-border/50">
                                    <TableHead className="w-12">
                                      <Checkbox
                                        checked={selectedCountForExpanded === expandedStudents.length && expandedStudents.length > 0}
                                        onCheckedChange={() => toggleSelectAll(expandedCohortId!)}
                                      />
                                    </TableHead>
                                    <TableHead className="font-black">Full Name</TableHead>
                                    <TableHead className="font-black">System ID</TableHead>
                                    <TableHead className="font-black">Gender</TableHead>
                                    <TableHead className="font-black">Date of Birth</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {filteredStudents.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No students found in this cohort.
                                      </TableCell>
                                    </TableRow>
                                  ) : filteredStudents.map((student) => {
                                    const isSelected = selectedStudentIds[expandedCohortId!]?.has(student.id) || false
                                    return (
                                      <TableRow 
                                        key={student.id} 
                                        className={`border-border/50 cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-900/50 ${isSelected ? 'bg-primary/5' : ''}`}
                                        onClick={() => toggleStudentSelection(expandedCohortId!, student.id)}
                                      >
                                        <TableCell>
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleStudentSelection(expandedCohortId!, student.id)}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </TableCell>
                                        <TableCell className="font-bold">
                                          <span className={isSelected ? 'text-primary' : ''}>{student.fullName}</span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs uppercase font-medium">{student.student_id}</TableCell>
                                        <TableCell className="text-sm font-medium">{student.gender || '-'}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">01 Jan 2010</TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </ScrollArea>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              {/* Rules Panel */}
              <div className="space-y-6">
                <Card className="border-none shadow-premium bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-8">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                       <Filter className="w-5 h-5 text-primary" /> Promotion Rules
                    </CardTitle>
                    <CardDescription>Target mapping for selected cohorts.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Academic Year */}
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2">
                       <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                          <Calendar className="w-3 h-3" /> Target Academic Year
                       </div>
                       <Input 
                          value={academicYear}
                          onChange={(e) => setAcademicYear(e.target.value)}
                          placeholder="e.g. 2025/2026"
                          className="bg-white dark:bg-slate-950 border-none h-10 font-black text-lg text-primary text-center"
                       />
                    </div>

                    {/* Selection Summary */}
                    {(promotionMode === 'bulk' ? totalSelectedInBulk : totalSelectedInSelective) > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800/30 flex items-center gap-3">
                        <div className="p-2 bg-green-200 dark:bg-green-800 rounded-lg">
                          {promotionMode === 'bulk' ? <Layers className="w-4 h-4 text-green-700 dark:text-green-300" /> : <UserCheck className="w-4 h-4 text-green-700 dark:text-green-300" />}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-lg font-black text-green-700 dark:text-green-400 leading-tight">
                             {promotionMode === 'bulk' ? totalSelectedInBulk : totalSelectedInSelective}
                           </span>
                           <span className="text-[10px] font-black text-green-600 uppercase tracking-tighter">Students Ready</span>
                        </div>
                      </div>
                    )}

                    <ScrollArea className="h-[350px] pr-4">
                      {cohorts
                        .filter(c => activeCohortIds.includes(c.id))
                        .map((cohort) => (
                        <div key={cohort.id} className="py-4 border-b border-border/50 last:border-0 group">
                          <div className="flex flex-col mb-3">
                            <span className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-between">
                              Grade {cohort.gradeName} - Sec {cohort.sectionName}
                              <Badge variant="secondary" className="text-[9px] font-black h-5">
                                {promotionMode === 'bulk' ? cohort.count : selectedStudentIds[cohort.id]?.size}
                              </Badge>
                            </span>
                            {cohort.streamName && (
                              <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">{cohort.streamName}</span>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-[9px] font-black text-muted-foreground uppercase ml-1">Destination Grade</Label>
                              <Select 
                                value={promotionRules[cohort.id]?.gradeId} 
                                onValueChange={(val) => setPromotionRules(prev => ({ 
                                  ...prev, 
                                  [cohort.id]: { ...prev[cohort.id], gradeId: val as any } 
                                }))}
                              >
                                <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-950/50 border-none h-10 font-bold focus:ring-1 focus:ring-primary">
                                  <SelectValue placeholder="Target Grade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {grades.map(g => (
                                    <SelectItem key={g.id} value={g.id}>Grade {g.name}</SelectItem>
                                  ))}
                                  <SelectItem value="GRADUATE">🎓 Graduation</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {promotionRules[cohort.id]?.gradeId !== 'GRADUATE' && (
                              <div className="space-y-1">
                                <Label className="text-[9px] font-black text-muted-foreground uppercase ml-1">Target Section Name</Label>
                                <Input 
                                  placeholder="e.g. A"
                                  className="h-10 bg-slate-50/50 dark:bg-slate-950/50 border-none text-sm font-bold"
                                  value={promotionRules[cohort.id]?.sectionName || ''}
                                  onChange={(e) => setPromotionRules(prev => ({
                                    ...prev,
                                    [cohort.id]: { ...prev[cohort.id], sectionName: e.target.value }
                                  }))}
                                />
                              </div>
                            )}

                            {/* Stream Selection logic (e.g. Grade 10 -> 11) */}
                            {grades.find(g => g.id === promotionRules[cohort.id]?.gradeId)?.name === '11' && (
                              <div className="space-y-1">
                                <Label className="text-[9px] font-black text-violet-600 uppercase ml-1 tracking-widest">Mandatory Stream</Label>
                                <Select 
                                  value={promotionRules[cohort.id]?.streamId} 
                                  onValueChange={(val) => setPromotionRules(prev => ({ 
                                    ...prev, 
                                    [cohort.id]: { ...prev[cohort.id], streamId: val } 
                                  }))}
                                >
                                  <SelectTrigger className="w-full bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 h-10 text-violet-700 dark:text-violet-400 font-black shadow-sm">
                                    <SelectValue placeholder="Select Stream" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {streams.map(s => (
                                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {activeCohortIds.length === 0 && (
                        <div className="text-center text-muted-foreground py-20 animate-in fade-in zoom-in duration-500">
                          <Box className="w-16 h-16 mx-auto mb-4 opacity-10" />
                          <p className="text-xs font-black text-muted-foreground/50 uppercase tracking-tighter">
                            Select a cohort to configure rules
                          </p>
                        </div>
                      )}
                    </ScrollArea>

                    <Button 
                      className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/30 transform transition-all hover:scale-[1.02] active:scale-[0.98]"
                      disabled={activeCohortIds.length === 0 || !isConfigurationComplete}
                      onClick={() => setIsPreviewDialogOpen(true)}
                    >
                      {activeCohortIds.length === 0 ? "Select Cohorts" : !isConfigurationComplete ? "Fix Stream Configuration" : "Review Promotion"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-none shadow-premium bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">Audit Trail</CardTitle>
                  <CardDescription>Historical promotion records for the current academic year.</CardDescription>
                </div>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-slate-900 border-none shadow-sm font-bold">
                      <Download className="w-4 h-4" /> Export logs
                   </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border border-border/50 overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50 font-black uppercase text-[10px]">
                      <TableRow className="border-border/50">
                        <TableHead className="font-black">Student Record</TableHead>
                        <TableHead className="font-black">Academic Year</TableHead>
                        <TableHead className="font-black">Transition</TableHead>
                        <TableHead className="font-black">Timestamp</TableHead>
                        <TableHead className="text-right font-black px-8">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-4">
                              <History className="w-12 h-12 opacity-10" />
                              <p className="font-black text-xs uppercase tracking-widest opacity-30">No records found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : history.map((h) => (
                        <TableRow key={h.id} className="border-border/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">{h.student.fullName}</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{h.student.student_id}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50/50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-500/20 font-black text-[10px]">
                              {h.academicYear}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-bold text-slate-500">{cohorts.find(c => c.gradeId === h.fromGradeId)?.gradeName || 'Prev'}</span>
                              <ArrowRight className="w-3 h-3 text-primary animate-pulse" />
                              {h.toGradeId ? (
                                <span className="font-black text-primary uppercase">{cohorts.find(c => c.gradeId === h.toGradeId)?.gradeName || 'Next'}</span>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 font-black text-[9px] uppercase tracking-widest">Graduated</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-400">
                            {format(new Date(h.promotedAt), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-right px-8">
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="group-hover:bg-red-50 group-hover:text-red-500 rounded-full transition-all"
                                onClick={() => handleRollback(h.id)}
                             >
                                <Undo2 className="w-4 h-4" />
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-3xl bg-white dark:bg-slate-950">
          <div className="p-10 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <DialogHeader>
              <DialogTitle className="text-4xl font-black flex items-center gap-4 tracking-tight">
                <div className="p-3 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                Promotion Summary
              </DialogTitle>
              <DialogDescription className="text-xl font-bold text-slate-600 dark:text-slate-400 mt-2">
                Committing <span className="text-primary font-black uppercase text-2xl">{promotionMode}</span> promotion for <span className="text-primary font-black underline decoration-4 underline-offset-4">{promotionMode === 'bulk' ? totalSelectedInBulk : totalSelectedInSelective}</span> students.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-10 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
              <div className="space-y-6">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                   <Box className="w-4 h-4" /> Cohort Breakdown
                </h3>
                <div className="space-y-3">
                   {activeCohortIds.map(cohortId => {
                     const cohort = cohorts.find(c => c.id === cohortId)
                     const rule = promotionRules[cohortId]
                     const targetGrade = grades.find(g => g.id === rule?.gradeId)
                     const count = promotionMode === 'bulk' ? cohort?.count : selectedStudentIds[cohortId]?.size
                     
                     return (
                       <div key={cohortId} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                         <div className="flex flex-col">
                           <span className="font-black text-sm">{cohort?.gradeName} - Sec {cohort?.sectionName}</span>
                           <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-0.5">Target: {targetGrade?.name || 'Graduation'}</span>
                         </div>
                         <Badge variant="default" className="text-xs font-black shadow-sm h-8 px-4">
                           {count} students
                         </Badge>
                       </div>
                     )
                   })}
                </div>
              </div>
              <div className="space-y-6">
                 <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Record Meta
                 </h3>
                 <div className="p-8 bg-slate-900 rounded-3xl flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <TrendingUp className="w-20 h-20 text-white" />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Effective Year</span>
                    <span className="text-4xl font-black text-white tracking-tight">{academicYear}</span>
                 </div>
              </div>
            </div>

            <div className="p-8 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-800/30 rounded-3xl flex gap-6 items-start">
               <AlertCircle className="w-8 h-8 text-amber-600 shrink-0 mt-1" />
               <div className="space-y-2">
                  <p className="font-black text-lg text-amber-900 dark:text-amber-400 leading-tight">Attention: Targeted cohorts will be updated.</p>
                  <p className="text-sm text-amber-800/80 dark:text-amber-300/60 leading-relaxed font-bold">
                    This action will update the <span className="underline decoration-2">Grade, Section, and Stream</span> of the students in the selected 
                    {activeCohortIds.length} cohorts. Unselected individuals within these cohorts will remain in their current state.
                  </p>
               </div>
            </div>
          </div>

          <div className="p-10 border-t border-border bg-slate-50 dark:bg-slate-900/50">
            <DialogFooter className="gap-4 flex flex-col sm:flex-row items-center justify-between">
              <Button variant="ghost" onClick={() => setIsPreviewDialogOpen(false)} className="rounded-2xl h-14 px-10 font-bold text-slate-500">
                Cancel
              </Button>
              <Button 
                onClick={executePromotion} 
                className="rounded-2xl h-14 px-16 text-xl font-black shadow-2xl shadow-primary/30 transform transition-all hover:scale-[1.03] active:scale-[0.97]"
                disabled={isSubmitLoading || !isConfigurationComplete}
              >
                {isSubmitLoading ? "Updating Records..." : `Execute Promotion`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
