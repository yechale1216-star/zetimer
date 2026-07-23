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
  ChevronDown,
  ShieldCheck,
  Download,
  ChevronLeft,
  UserCheck,
  UserX,
  Layers,
  User,
  Box,
  Check,
  Play
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
  DialogTitle 
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
import { cn } from '@/lib/utils/utils'

import { apiUrl } from '@/lib/api-config'
const API_URL = apiUrl;

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
  
  // Wizard Steps: 1 = Setup, 2 = Selection, 3 = Targets, 4 = Review
  const [currentStep, setCurrentStep] = useState(1)
  
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
  
  const headers = useMemo(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('attendance_token') : null
    const schoolId = typeof window !== 'undefined' ? localStorage.getItem('x-school-id') : null
    return {
      'Authorization': `Bearer ${token}`,
      'x-school-id': schoolId || '',
      'Content-Type': 'application/json'
    }
  }, [])

  const loadData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true)
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

      let latestGrades: Grade[] = []
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
            sectionName: cohort.sectionName || ''
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

  useEffect(() => {
    loadData()

    const pollInterval = setInterval(() => {
      loadData(true)
    }, 10000)

    return () => clearInterval(pollInterval)
  }, [])

  // Fetch students for a specific cohort
  const loadStudentsForCohort = async (cohort: PromotionCohort) => {
    if (cohortStudents[cohort.id]) return
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
      setSelectedStudentIds(prev => ({ ...prev, [cohortId]: new Set() }))
    } else {
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
      if (rule.gradeId !== 'GRADUATE') {
        const targetGradeNum = parseInt((targetGrade?.name || '').replace(/[^\d]/g, '')) || 0
        if (targetGradeNum >= 11 && !rule.streamId) {
          return false
        }
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
          payload.notes = `Bulk promotion: Grade ${cohort.gradeName} ${cohort.streamName ? cohort.streamName + ' ' : ''}Section ${cohort.sectionName}`
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
      
      // Reset Wizard
      setCurrentStep(1)
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

  // Stepper steps configuration
  const steps = [
    { number: 1, label: "Setup" },
    { number: 2, label: "Selection" },
    { number: 3, label: "Targets" },
    { number: 4, label: "Review" }
  ]

  // Wizard Navigation Handlers
  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2)
    } else if (currentStep === 2) {
      const selectionsCount = promotionMode === 'bulk' ? selectedCohortIds.size : totalSelectedInSelective
      if (selectionsCount === 0) {
        notifications.warning("Selection Required", "Please select at least one cohort or student before proceeding.")
        return
      }
      setCurrentStep(3)
    } else if (currentStep === 3) {
      if (!isConfigurationComplete) {
        notifications.warning("Configuration Incomplete", "Please complete all target rule configurations, including mandatory streams where applicable.")
        return
      }
      setCurrentStep(4)
    }
  }

  const handleBack = () => {
    if (currentStep === 2 && expandedCohortId !== null) {
      setExpandedCohortId(null)
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Calculate if the "Next" button should be disabled
  const isNextDisabled = useMemo(() => {
    if (currentStep === 2) {
      return promotionMode === 'bulk' ? selectedCohortIds.size === 0 : totalSelectedInSelective === 0
    }
    if (currentStep === 3) {
      return !isConfigurationComplete
    }
    return false
  }, [currentStep, promotionMode, selectedCohortIds, totalSelectedInSelective, isConfigurationComplete])

  return (
    <div className="space-y-6 pb-40 md:pb-16 max-w-5xl mx-auto px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/90 dark:bg-slate-900/90 p-4 md:p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 backdrop-blur-sm shadow-sm pt-safe">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" /> Promotion
          </h1>
          <p className="text-[10px] md:text-sm font-bold text-slate-500/60 dark:text-slate-400/60 uppercase tracking-widest mt-1">
            Student Advancement Wizard
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-2 w-full md:w-[240px] bg-slate-100 dark:bg-slate-800 rounded-2xl h-11 p-1">
            <TabsTrigger value="promote" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
              Promote
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">
              History
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "promote" ? (
          <motion.div
            key="promote"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* STEP PROGRESS INDICATOR */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              {/* Desktop Stepper */}
              <div className="hidden md:flex justify-between items-center relative">
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-355"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />
                
                {steps.map((s) => {
                  const isActive = currentStep >= s.number
                  const isCurrent = currentStep === s.number
                  return (
                    <div key={s.number} className="flex flex-col items-center z-10 relative">
                      <div 
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2",
                          isCurrent 
                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110" 
                            : isActive 
                              ? "bg-primary/10 border-primary text-primary" 
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
                        )}
                      >
                        {isActive && !isCurrent ? <Check className="w-5 h-5" /> : s.number}
                      </div>
                      <span 
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest mt-2 transition-all duration-300",
                          isCurrent ? "text-primary font-bold" : "text-slate-400"
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Mobile Stepper */}
              <div className="md:hidden space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Step {currentStep} of {steps.length}: {steps[currentStep - 1].label}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {Math.round(((currentStep) / steps.length) * 100)}% Complete
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(currentStep / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* STEP VIEWS */}
            <div className="min-h-[350px]">
              <AnimatePresence mode="wait">
                {/* STEP 1: SETUP */}
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <Card className="border-none shadow-premium bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Play className="w-5 h-5 text-primary" /> Setup Promotion Parameters
                        </CardTitle>
                        <CardDescription>
                          Choose the target academic year and the advancement scope mode.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        {/* Target Academic Year */}
                        <div className="space-y-2 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-1">
                            <Calendar className="w-4 h-4 text-primary" /> Target Academic Year
                          </Label>
                          <Input 
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            placeholder="e.g. 2025/2026"
                            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-12 font-black text-xl text-primary text-center tracking-wider max-w-sm"
                          />
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            The target academic year students will transition into.
                          </p>
                        </div>

                        {/* Mode Select options */}
                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                            Promotion Scope
                          </Label>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Bulk Mode Option */}
                            <div 
                              onClick={() => setPromotionMode('bulk')}
                              className={cn(
                                "p-6 rounded-3xl border-2 cursor-pointer transition-all flex gap-4 items-start active:scale-[0.98]",
                                promotionMode === 'bulk' 
                                  ? "border-primary bg-primary/5 dark:bg-primary/5 shadow-md shadow-primary/5" 
                                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                              )}
                            >
                              <div className={cn(
                                "p-3 rounded-2xl shrink-0 mt-0.5",
                                promotionMode === 'bulk' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              )}>
                                <Layers className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-base mb-1">
                                  Bulk Promotion
                                </h3>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                  Promote entire cohorts (Grade, Stream, and Section combinations) altogether. Fast and efficient for normal end-of-year rollings.
                                </p>
                              </div>
                            </div>

                            {/* Selective Mode Option */}
                            <div 
                              onClick={() => setPromotionMode('selective')}
                              className={cn(
                                "p-6 rounded-3xl border-2 cursor-pointer transition-all flex gap-4 items-start active:scale-[0.98]",
                                promotionMode === 'selective' 
                                  ? "border-primary bg-primary/5 dark:bg-primary/5 shadow-md shadow-primary/5" 
                                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                              )}
                            >
                              <div className={cn(
                                "p-3 rounded-2xl shrink-0 mt-0.5",
                                promotionMode === 'selective' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              )}>
                                <UserCheck className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-base mb-1">
                                  Selective Promotion
                                </h3>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                  Select specific students from sections to promote while retaining others. Ideal when handling retentions, individual transfers, or custom filters.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* STEP 2: SELECTION */}
                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <AnimatePresence mode="wait">
                      {/* Drilldown Sub-view for student selection */}
                      {promotionMode === 'selective' && expandedCohortId !== null ? (
                        <motion.div
                          key="student-checklist"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                        >
                          <Card className="border-none shadow-premium bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
                            <CardHeader className="pb-4">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="rounded-full h-10 w-10 shrink-0 border-slate-200 dark:border-slate-800" 
                                    onClick={() => setExpandedCohortId(null)}
                                  >
                                    <ChevronLeft className="w-5 h-5" />
                                  </Button>
                                  <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                      {expandedCohort?.gradeName} {expandedCohort?.streamName ? '- ' + expandedCohort.streamName : ''} (Sec {expandedCohort?.sectionName})
                                    </CardTitle>
                                    <CardDescription>
                                      Select students to promote ({selectedCountForExpanded} / {expandedStudents.length} selected)
                                    </CardDescription>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-10 rounded-2xl font-bold text-xs gap-1.5 border-slate-200 dark:border-slate-800 px-4"
                                    onClick={() => toggleSelectAll(expandedCohortId!)}
                                  >
                                    {selectedCountForExpanded === expandedStudents.length ? (
                                      <><UserX className="w-4 h-4" /> Clear All</>
                                    ) : (
                                      <><UserCheck className="w-4 h-4" /> Select All</>
                                    )}
                                  </Button>
                                </div>
                              </div>

                              <div className="relative mt-4">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                  placeholder="Search students by name or ID..." 
                                  className="pl-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11 rounded-2xl text-sm"
                                  value={studentSearchTerm}
                                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                                />
                              </div>
                            </CardHeader>
                            
                            <CardContent className="p-0">
                              {loadingStudents ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                  <span className="font-bold text-xs uppercase tracking-widest text-slate-500/80">Loading student roster...</span>
                                </div>
                              ) : (
                                <ScrollArea className="h-[450px]">
                                  <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4 pb-4">
                                    {filteredStudents.length === 0 ? (
                                      <div className="py-20 text-center text-slate-400 font-medium">
                                        No students found matching your criteria.
                                      </div>
                                    ) : filteredStudents.map((student) => {
                                      const isSelected = selectedStudentIds[expandedCohortId!]?.has(student.id) || false
                                      return (
                                        <div 
                                          key={student.id} 
                                          className={cn(
                                            "flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all rounded-2xl my-1",
                                            isSelected ? "bg-primary/5 dark:bg-primary/5" : ""
                                          )}
                                          onClick={() => toggleStudentSelection(expandedCohortId!, student.id)}
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                              <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleStudentSelection(expandedCohortId!, student.id)}
                                                className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-700"
                                              />
                                            </div>
                                            <div className="flex flex-col">
                                              <span className={cn("font-bold text-sm text-slate-955 dark:text-white leading-tight", isSelected && "text-primary")}>
                                                {student.fullName}
                                              </span>
                                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-tight mt-0.5">
                                                {student.student_id} {student.gender ? `â€¢ ${student.gender}` : ''}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold">
                                              {student.section?.name || 'No Sec'}
                                            </Badge>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </ScrollArea>
                              )}
                              
                              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center rounded-b-3xl">
                                <span className="text-xs font-bold text-slate-500 uppercase">
                                  Cohort Total: {expandedStudents.length}
                                </span>
                                <Button 
                                  variant="default" 
                                  className="h-10 rounded-2xl font-black text-xs uppercase px-6"
                                  onClick={() => setExpandedCohortId(null)}
                                >
                                  Done Selection
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ) : (
                        /* Cohort Grid Selection */
                        <motion.div
                          key="cohort-grid"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <div className="flex flex-col gap-3">
                            <div>
                              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                {promotionMode === 'bulk' ? "Select Cohorts for Promotion" : "Select Cohorts to Drilldown"}
                              </h2>
                              <p className="text-xs font-medium text-slate-400">
                                {promotionMode === 'bulk' 
                                  ? "Toggle cards to select the entire class sections you want to advance."
                                  : "Choose a class card to select individual students inside."}
                              </p>
                            </div>
                            
                            <div className="relative w-full">
                              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input 
                                placeholder="Filter classes by grade or section..." 
                                className="pl-10 bg-white dark:bg-slate-905/50 border-slate-200 dark:border-slate-800 h-11 rounded-2xl text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Grid lists */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {isLoading ? (
                              Array(6).fill(0).map((_, i) => (
                                <div key={i} className="h-32 bg-slate-50 dark:bg-slate-900 animate-pulse rounded-[28px] border border-slate-100 dark:border-slate-800/80" />
                              ))
                            ) : filteredCohorts.length === 0 ? (
                              <div className="col-span-full py-20 text-center text-slate-450 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 font-medium">
                                No active cohorts found.
                              </div>
                            ) : filteredCohorts.map((cohort) => {
                              const isSelected = promotionMode === 'bulk' 
                                ? selectedCohortIds.has(cohort.id)
                                : (selectedStudentIds[cohort.id]?.size || 0) > 0
                              
                              const countSelected = selectedStudentIds[cohort.id]?.size || 0
                              
                              return (
                                <div 
                                  key={cohort.id} 
                                  className={cn(
                                    "relative p-5 bg-white dark:bg-slate-900 rounded-[28px] border transition-all active:scale-[0.98] cursor-pointer group flex flex-col justify-between h-36 select-none",
                                    isSelected 
                                      ? "border-primary ring-1 ring-primary shadow-lg shadow-primary/5 bg-primary/[0.01]" 
                                      : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                                  )}
                                  onClick={() => handleCohortClick(cohort)}
                                >
                                  <div>
                                    <div className="flex items-start justify-between">
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">
                                          {cohort.gradeName}
                                        </span>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                                          Section {cohort.sectionName}
                                        </h3>
                                        {cohort.streamName && (
                                          <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mt-0.5">
                                            {cohort.streamName}
                                          </span>
                                        )}
                                      </div>

                                      {/* Indicator */}
                                      <div className={cn(
                                        "w-8 h-8 flex items-center justify-center rounded-xl transition-all",
                                        isSelected 
                                          ? "bg-primary text-white" 
                                          : "bg-slate-50 dark:bg-slate-800/80 text-slate-400 group-hover:text-slate-600"
                                      )}>
                                        {promotionMode === 'bulk' ? (
                                          isSelected ? <CheckCircle2 className="w-5 h-5" /> : <Box className="w-4 h-4" />
                                        ) : (
                                          <ChevronRight className="w-5 h-5" />
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 dark:border-slate-850">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-slate-400/85" /> {cohort.count} Students
                                    </span>
                                    
                                    {promotionMode === 'selective' && isSelected && (
                                      <Badge variant="default" className="text-[9px] font-black uppercase tracking-wider h-6 px-2.5">
                                        {countSelected} Selected
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Selection summary statistics banner */}
                          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center text-xs font-bold text-primary">
                            <span>
                              {promotionMode === 'bulk' 
                                ? `${selectedCohortIds.size} Cohorts Marked` 
                                : `${Object.keys(selectedStudentIds).filter(k => selectedStudentIds[k].size > 0).length} Cohorts Configured`
                              }
                            </span>
                            <span>
                              Total Ready: {promotionMode === 'bulk' ? totalSelectedInBulk : totalSelectedInSelective} Students
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* STEP 3: DESTINATION RULES */}
                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                          <Filter className="w-5 h-5 text-primary" /> Destination Rules Mapping
                        </h2>
                        <p className="text-xs font-medium text-slate-400">
                          Configure destination grades, mandatory streams, and target section names for advanced students.
                        </p>
                      </div>
                    </div>

                    <Card className="border-none shadow-premium bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl">
                      <CardContent className="p-6 divide-y divide-slate-100 dark:divide-slate-800">
                        {cohorts
                          .filter(c => activeCohortIds.includes(c.id))
                          .map((cohort) => {
                            const currentRule = promotionRules[cohort.id] || { gradeId: '', sectionName: '' }
                            const targetGrade = grades.find(g => g.id === currentRule.gradeId)
                            const targetGradeNum = targetGrade ? (parseInt((targetGrade.name || '').replace(/[^\d]/g, '')) || 0) : 0
                            
                            // Mandatory Stream is required if Target Grade is 11 or 12
                            const isStreamRequired = targetGradeNum >= 11
                            
                            return (
                              <div key={cohort.id} className="py-6 first:pt-0 last:pb-0 flex flex-col gap-4">
                                {/* Cohort Origin Detail */}
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                                  <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Class</span>
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-base flex items-center gap-2 leading-tight">
                                      {cohort.gradeName} - Sec {cohort.sectionName}
                                      {cohort.streamName && (
                                        <Badge variant="outline" className="text-[9px] font-bold text-violet-600 dark:text-violet-400 border-violet-500/25">
                                          {cohort.streamName}
                                        </Badge>
                                      )}
                                    </h4>
                                  </div>
                                  
                                  <Badge variant="secondary" className="self-start sm:self-center text-xs font-black uppercase px-3 py-1">
                                    {promotionMode === 'bulk' ? cohort.count : selectedStudentIds[cohort.id]?.size} Students
                                  </Badge>
                                </div>

                                {/* Inputs */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Destination Grade */}
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Destination Grade</Label>
                                    <Select 
                                      value={currentRule.gradeId} 
                                      onValueChange={(val) => setPromotionRules(prev => ({ 
                                        ...prev, 
                                        [cohort.id]: { ...prev[cohort.id]!, gradeId: val } 
                                      }))}
                                    >
                                      <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 h-11 rounded-2xl font-bold text-sm focus:ring-1 focus:ring-primary">
                                        <SelectValue placeholder="Select Grade" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {grades.map(g => (
                                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                        ))}
                                        <SelectItem value="GRADUATE">ðŸŽ“ Graduation / Complete</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Destination Stream (if target is Gr 11 or 12) */}
                                  {currentRule.gradeId !== 'GRADUATE' && isStreamRequired ? (
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest ml-1">Mandatory Stream</Label>
                                      <Select 
                                        value={currentRule.streamId} 
                                        onValueChange={(val) => setPromotionRules(prev => ({ 
                                          ...prev, 
                                          [cohort.id]: { ...prev[cohort.id]!, streamId: val } 
                                        }))}
                                      >
                                        <SelectTrigger className="w-full bg-violet-50/50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/80 h-11 rounded-2xl text-violet-750 dark:text-violet-400 font-black shadow-sm text-sm">
                                          <SelectValue placeholder="Choose Stream" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {streams.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ) : (
                                    /* Placeholder or empty cell if stream is not needed */
                                    <div className="hidden md:block" />
                                  )}

                                  {/* Destination Section */}
                                  {currentRule.gradeId !== 'GRADUATE' && (
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Target Section Name</Label>
                                      <Input 
                                        placeholder="e.g. A"
                                        className="h-11 rounded-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm font-bold"
                                        value={currentRule.sectionName}
                                        onChange={(e) => setPromotionRules(prev => ({
                                          ...prev,
                                          [cohort.id]: { ...prev[cohort.id]!, sectionName: e.target.value }
                                        }))}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* STEP 4: REVIEW & EXECUTE */}
                {currentStep === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 rounded-3xl border border-primary/10 flex items-start gap-4">
                      <div className="p-3.5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/10 shrink-0">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                          Review Promotion Parameters
                        </h2>
                        <p className="text-sm text-slate-500 font-bold mt-1">
                          Academic Year: <span className="text-primary">{academicYear}</span> â€¢ Mode: <span className="text-primary uppercase">{promotionMode}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Left: Summary cards list */}
                      <div className="md:col-span-2 space-y-4">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                           <Box className="w-4.5 h-4.5" /> Target Cohort Breakdown
                        </h3>
                        
                        <div className="space-y-3">
                          {cohorts
                            .filter(c => activeCohortIds.includes(c.id))
                            .map(cohort => {
                              const rule = promotionRules[cohort.id]
                              const targetGrade = grades.find(g => g.id === rule?.gradeId)
                              const targetStream = streams.find(s => s.id === rule?.streamId)
                              const count = promotionMode === 'bulk' ? cohort.count : selectedStudentIds[cohort.id]?.size
                              
                              return (
                                <div key={cohort.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 gap-3">
                                  <div className="flex flex-col">
                                    <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">
                                      {cohort.gradeName} - Sec {cohort.sectionName}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Destination:</span>
                                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                        {rule?.gradeId === 'GRADUATE' ? 'ðŸŽ“ Graduation' : `${targetGrade?.name} (Sec ${rule?.sectionName || cohort.sectionName})`}
                                      </span>
                                      {rule?.gradeId !== 'GRADUATE' && targetStream && (
                                        <Badge variant="outline" className="text-[8px] font-bold h-5 text-violet-600 dark:text-violet-400 border-violet-500/20 px-1.5 uppercase">
                                          {targetStream.name}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="default" className="text-xs font-black shadow-sm h-8 px-4 self-start sm:self-center">
                                    {count} students
                                  </Badge>
                                </div>
                              )
                            })}
                        </div>
                      </div>

                      {/* Right: Warnings and Stats summary */}
                      <div className="space-y-6">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                           Summary Figures
                        </h3>

                        {/* Student Count Panel */}
                        <div className="p-6 bg-slate-900 dark:bg-slate-950 border border-slate-850 rounded-3xl text-center shadow-inner relative overflow-hidden flex flex-col justify-center items-center">
                          <span className="text-[9px] font-black text-slate-405 uppercase tracking-[0.2em] mb-1">Total Selected Students</span>
                          <span className="text-5xl font-black text-white tracking-tight leading-none mb-1">
                            {promotionMode === 'bulk' ? totalSelectedInBulk : totalSelectedInSelective}
                          </span>
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest">Ready for advancement</span>
                        </div>

                        {/* Attention warning banner */}
                        <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-800/30 rounded-3xl flex gap-3 items-start">
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-black text-sm text-amber-900 dark:text-amber-400 leading-tight">Attention</p>
                            <p className="text-xs text-amber-800/80 dark:text-amber-300/60 leading-relaxed font-bold">
                              This action will update the grade and section records of students instantly. The process can be rolled back individually in the audit trail if necessary.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* WIZARD FLOATING STICKY ACTION BAR */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center gap-4 backdrop-blur-md z-30 md:static md:bg-transparent md:border-none md:p-0 md:shadow-none md:mt-8">
              <div className="max-w-5xl w-full mx-auto flex justify-between gap-4">
                {/* Back button */}
                {currentStep > 1 ? (
                  <Button 
                    variant="outline" 
                    onClick={handleBack} 
                    className="h-12 md:h-14 rounded-2xl font-bold px-6 text-slate-650 shrink-0 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  >
                    Back
                  </Button>
                ) : (
                  /* Spacer so layout aligns */
                  <div className="w-0 shrink-0" />
                )}

                {/* Forward / Action buttons */}
                {currentStep < 4 ? (
                  <Button 
                    onClick={handleNext} 
                    disabled={isNextDisabled}
                    className="flex-1 md:flex-none md:w-60 h-12 md:h-14 rounded-2xl text-sm font-black shadow-lg shadow-primary/20 transform transition-all active:scale-[0.98]"
                  >
                    Next Step <ChevronRight className="w-4 h-4 ml-1.5" />
                  </Button>
                ) : (
                  <Button 
                    onClick={executePromotion} 
                    disabled={isSubmitLoading || !isConfigurationComplete}
                    className="flex-1 md:flex-none md:w-60 h-12 md:h-14 rounded-2xl text-sm font-black shadow-lg shadow-primary/20 transform transition-all active:scale-[0.98]"
                  >
                    {isSubmitLoading ? "Advancing Students..." : "Confirm & Execute"}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* AUDIT TRAIL LOGS VIEW */
          /* AUDIT TRAIL LOGS VIEW */
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
                              <span className="font-black text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">{h.student?.fullName || 'Unknown Student'}</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{h.student?.student_id || '-'}</span>
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
    </div>
  )
}

