"use client"

import React, { useState, useMemo, useEffect } from "react"
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Users, 
  UserPlus, 
  FileDown, 
  Filter, 
  Search, 
  ChevronRight,
  Download,
  UploadCloud
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ValidationService } from "@/lib/utils/validation"
import { database, Student } from "@/lib/db/database"
import { notifications } from "@/lib/utils/notifications"
import { motion, AnimatePresence } from "framer-motion"

interface PreviewRow extends Student {
  isValid: boolean
  errors: string[]
  isNewParent: boolean
}

interface StudentImportPreviewProps {
  data: any[]
  onImport: (validData: Student[]) => Promise<void>
  onCancel: () => void
  isImporting: boolean
}

export function StudentImportPreview({ data, onImport, onCancel, isImporting }: StudentImportPreviewProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [isValidating, setIsValidating] = useState(true)

  useEffect(() => {
    const validateData = async () => {
      setIsValidating(true)
      try {
        // 1. Basic validation
        const validatedRows: PreviewRow[] = data.map((item, index) => {
          const nameVal = ValidationService.validateName(item.name)
          const phoneVal = ValidationService.validatePhone(item.parent_phone)
          const gradeVal = ValidationService.validateRequired(item.grade, "Grade")
          const sectionVal = ValidationService.validateRequired(item.section, "Section")
          const parentNameVal = ValidationService.validateRequired(item.parent_name, "Parent Name")

          const combined = ValidationService.combineValidationResults(
            nameVal, phoneVal, gradeVal, sectionVal, parentNameVal
          )

          return {
            ...item,
            isValid: combined.isValid,
            errors: combined.errors,
            isNewParent: true // Default, will check below
          }
        })

        // 2. Batch check parent existence
        const phones = validatedRows.map(r => r.parent_phone).filter((p): p is string => !!p)
        if (phones.length > 0) {
          const existence = await database.checkParentsBatch(phones)
          const phoneMap = new Map<string, boolean>()
          phones.forEach((p, i) => phoneMap.set(p, !existence[i])) // true if NEW

          validatedRows.forEach(r => {
            if (r.parent_phone) {
              r.isNewParent = phoneMap.get(r.parent_phone) || false
            }
          })
        }

        setRows(validatedRows)
      } catch (error) {
        console.error("Validation error:", error)
        notifications.error("Validation Failed", "An error occurred while validating the data.")
      } finally {
        setIsValidating(false)
      }
    }

    validateData()
  }, [data])

  const stats = useMemo(() => {
    const total = rows.length
    const valid = rows.filter(r => r.isValid).length
    const invalid = total - valid
    const newParents = new Set(rows.filter(r => r.isNewParent).map(r => r.parent_phone)).size
    return { total, valid, invalid, newParents }
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchesSearch = 
        row.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.parent_phone?.includes(searchTerm) ||
        row.grade?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesTab = 
        activeTab === "all" || 
        (activeTab === "valid" && row.isValid) || 
        (activeTab === "errors" && !row.isValid)

      return matchesSearch && matchesTab
    })
  }, [rows, searchTerm, activeTab])

  const downloadErrorLog = () => {
    const errorRows = rows.filter(r => !r.isValid)
    if (errorRows.length === 0) return

    const headers = ["name", "grade", "section", "parent_name", "parent_phone", "error_messages"]
    const csvContent = [
      headers.join(","),
      ...errorRows.map(r => [
        `"${r.name}"`,
        `"${r.grade}"`,
        `"${r.section}"`,
        `"${r.parent_name}"`,
        `"${r.parent_phone}"`,
        `"${r.errors.join("; ")}"`
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "import_errors.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = () => {
    const validData = rows.filter(r => r.isValid)
    if (validData.length === 0) {
      notifications.error("No Valid Records", "There are no valid records to import.")
      return
    }
    onImport(validData)
  }

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <UploadCloud className="w-12 h-12 text-primary animate-pulse" />
        <p className="text-muted-foreground animate-pulse">Validating import data...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          icon={<CheckCircle2 className="text-emerald-500" />} 
          label="Valid Rows" 
          value={stats.valid} 
          subValue={`out of ${stats.total}`}
          color="emerald"
        />
        <StatCard 
          icon={<AlertCircle className="text-rose-500" />} 
          label="Invalid Rows" 
          value={stats.invalid} 
          subValue="need correction"
          color="rose"
        />
        <StatCard 
          icon={<UserPlus className="text-blue-500" />} 
          label="New Parents" 
          value={stats.newParents} 
          subValue="to be created"
          color="blue"
        />
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary/70">Ready to Import</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-primary">{stats.valid}</span>
              <span className="text-sm text-primary/60 font-medium">Students</span>
            </div>
            <Button 
              size="sm" 
              className="mt-3 w-full rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              onClick={handleImport}
              disabled={isImporting || stats.valid === 0}
            >
              {isImporting ? "Importing..." : "Finalize Import"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Toolbox */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/30 p-2 rounded-2xl border border-border/50">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search preview..." 
            className="pl-9 h-10 border-none bg-transparent focus-visible:ring-0" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="all" className="rounded-lg px-4 text-xs font-medium">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="valid" className="rounded-lg px-4 text-xs font-medium data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Valid ({stats.valid})</TabsTrigger>
            <TabsTrigger value="errors" className="rounded-lg px-4 text-xs font-medium data-[state=active]:bg-rose-500 data-[state=active]:text-white">Errors ({stats.invalid})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 w-full md:w-auto">
          {stats.invalid > 0 && (
            <Button variant="outline" size="sm" onClick={downloadErrorLog} className="rounded-xl h-10 border-rose-500/20 text-rose-600 hover:bg-rose-50">
              <Download className="w-4 h-4 mr-2" />
              Download Errors
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-xl h-10">
            Cancel
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="relative border border-border/50 rounded-2xl overflow-hidden bg-background flex-1 min-h-0">
        <ScrollArea className="h-full min-h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-md z-10">
              <TableRow className="border-border/50">
                <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider">Student Name</TableHead>
                <TableHead className="w-[100px] text-xs font-bold uppercase tracking-wider">Grade/Section</TableHead>
                <TableHead className="w-[150px] text-xs font-bold uppercase tracking-wider">Parent Details</TableHead>
                <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Validation Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filteredRows.map((row, idx) => (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`group border-border/40 transition-colors ${!row.isValid ? "bg-rose-50/30 dark:bg-rose-900/20 hover:bg-rose-50/50 dark:hover:bg-rose-900/30" : "hover:bg-muted/30"}`}
                  >
                    <TableCell className="py-3 font-medium text-sm">
                      {row.name}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold">{row.grade}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{row.section} / {row.stream || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{row.parent_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{row.parent_phone}</span>
                          {row.isNewParent && <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700">New</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {row.isValid ? (
                        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 gap-1 rounded-lg py-0.5 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          VALID
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-700 gap-1 rounded-lg py-0.5 font-bold text-[10px]">
                          <XCircle className="w-3 h-3" />
                          ERROR
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      {!row.isValid ? (
                        <div className="flex flex-wrap gap-1">
                          {row.errors.map((err, i) => (
                            <span key={i} className="text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-900/30 px-2 py-0.5 rounded-md border border-rose-200/50 dark:border-rose-700/50">
                              {err}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No issues found</span>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Search className="w-8 h-8 opacity-20" />
                      <p>No records match your criteria.</p>
                      <Button variant="ghost" className="text-primary h-8" onClick={() => { setSearchTerm(""); setActiveTab("all"); }}>Reset Filters</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, subValue, color }: { icon: React.ReactNode, label: string, value: number, subValueText?: string, subValueTextSecondary?: string, color: string, subValue?: string }) {
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/20",
    rose: "border-rose-200 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-900/20",
    blue: "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20",
  }

  return (
    <Card className={`${colorMap[color]} shadow-none border transition-all hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-border/20">
            {icon}
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">{label}</span>
            <div className="text-2xl font-black mt-1">{value}</div>
            <p className="text-[10px] font-medium text-muted-foreground/60">{subValue}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
