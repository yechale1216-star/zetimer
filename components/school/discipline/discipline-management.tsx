'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  FileText,
  Paperclip,
  Eye,
  Trash2,
  Edit,
  Send,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  X,
  Tag,
  BarChart3,
  ClipboardList,
  Layers,
  Sparkles,
  ExternalLink,
  Check,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

import {
  DisciplineApi,
  StudentDiscipline,
  DisciplineCategory,
  DisciplineAnalytics
} from '@/lib/discipline-service';

interface DisciplineManagementProps {
  userRole?: 'school_admin' | 'teacher' | 'super_admin';
}

export function DisciplineManagement({ userRole = 'school_admin' }: DisciplineManagementProps) {
  const [activeTab, setActiveTab] = useState<'incidents' | 'analytics' | 'categories'>('incidents');
  
  // Data States
  const [incidents, setIncidents] = useState<StudentDiscipline[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<DisciplineAnalytics | null>(null);
  const [categories, setCategories] = useState<DisciplineCategory[]>([]);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  // Students List for Wizard
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState<StudentDiscipline | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  
  // Follow-up state inside detail
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpAction, setFollowUpAction] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<string>('');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

  // Form State for Wizard
  const [formData, setFormData] = useState({
    studentId: '',
    selectedStudentName: '',
    selectedStudentGrade: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    categoryName: 'Classroom Misbehavior',
    categoryId: '',
    severity: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    title: '',
    description: '',
    location: '',
    witnessesText: '',
    immediateAction: '',
    evidence: [] as { url: string; name: string; type: string; size?: number }[],
    parentNotified: true,
    followUpDate: ''
  });

  // Upload progress helper
  const [isUploading, setIsUploading] = useState(false);

  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const res = await DisciplineApi.getIncidents({
        page,
        limit: 15,
        search,
        severity: severityFilter === 'ALL' ? undefined : severityFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        categoryName: categoryFilter === 'ALL' ? undefined : categoryFilter
      });
      setIncidents(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load discipline records');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalyticsAndCategories = async () => {
    try {
      const [ana, cats] = await Promise.all([
        DisciplineApi.getAnalytics(),
        DisciplineApi.getCategories()
      ]);
      setAnalytics(ana);
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching analytics/categories:', err);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, severityFilter, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchAnalyticsAndCategories();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  // Fetch students for wizard step 1
  const fetchStudents = async (query = '') => {
    setIsLoadingStudents(true);
    try {
      const token = localStorage.getItem('attendance_token');
      const schoolId = localStorage.getItem('x-school-id');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://zetime-backend.onrender.com';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (schoolId) headers['x-school-id'] = schoolId;

      const res = await fetch(`${apiUrl}/api/students?limit=50&search=${encodeURIComponent(query)}`, { headers });
      const data = await res.json();
      if (data.students) setStudents(data.students);
      else if (data.data) setStudents(data.data);
      else setStudents([]);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (isCreateOpen && createStep === 1) {
      fetchStudents(studentSearch);
    }
  }, [isCreateOpen, createStep, studentSearch]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: { url: string; name: string; type: string; size?: number }[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        newAttachments.push({
          url: base64Url,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size
        });

        if (newAttachments.length === files.length) {
          setFormData((prev) => ({
            ...prev,
            evidence: [...prev.evidence, ...newAttachments]
          }));
          setIsUploading(false);
          toast.success(`${files.length} evidence file(s) attached`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveEvidence = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index)
    }));
  };

  const handleCreateIncidentSubmit = async () => {
    if (!formData.studentId) {
      toast.error('Please select a student');
      return;
    }
    if (!formData.title || !formData.description) {
      toast.error('Title and detailed description are required');
      return;
    }

    try {
      const witnesses = formData.witnessesText
        ? formData.witnessesText.split(',').map((w) => w.trim()).filter(Boolean)
        : [];

      await DisciplineApi.createIncident({
        studentId: formData.studentId,
        date: formData.date,
        time: formData.time,
        categoryId: formData.categoryId || undefined,
        categoryName: formData.categoryName,
        severity: formData.severity,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        witnesses,
        evidence: formData.evidence,
        immediateAction: formData.immediateAction,
        parentNotified: formData.parentNotified,
        followUpDate: formData.followUpDate || undefined
      });

      toast.success('Discipline incident created successfully!');
      setIsCreateOpen(false);
      setCreateStep(1);
      setFormData({
        studentId: '',
        selectedStudentName: '',
        selectedStudentGrade: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        categoryName: 'Classroom Misbehavior',
        categoryId: '',
        severity: 'LOW',
        title: '',
        description: '',
        location: '',
        witnessesText: '',
        immediateAction: '',
        evidence: [],
        parentNotified: true,
        followUpDate: ''
      });

      fetchIncidents();
      fetchAnalyticsAndCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save incident');
    }
  };

  const handleAddFollowUpSubmit = async () => {
    if (!selectedIncident || !followUpNote.trim()) {
      toast.error('Follow-up note is required');
      return;
    }

    setIsSubmittingFollowUp(true);
    try {
      await DisciplineApi.addFollowUp(selectedIncident.id, {
        note: followUpNote,
        actionTaken: followUpAction || undefined,
        status: followUpStatus || undefined
      });

      toast.success('Follow-up note added');
      setFollowUpNote('');
      setFollowUpAction('');

      // Refresh single incident
      const updated = await DisciplineApi.getIncidentById(selectedIncident.id);
      setSelectedIncident(updated);
      fetchIncidents();
      fetchAnalyticsAndCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add follow-up');
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  const handleStatusChange = async (newStatus: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED') => {
    if (!selectedIncident) return;
    try {
      const updated = await DisciplineApi.updateIncident(selectedIncident.id, {
        status: newStatus,
        notifyParent: true
      });
      setSelectedIncident(updated);
      toast.success(`Status updated to ${newStatus}`);
      fetchIncidents();
      fetchAnalyticsAndCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDeleteIncident = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discipline record? This action cannot be undone.')) return;
    try {
      await DisciplineApi.deleteIncident(id);
      toast.success('Incident deleted');
      if (selectedIncident?.id === id) setIsDetailOpen(false);
      fetchIncidents();
      fetchAnalyticsAndCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await DisciplineApi.createCategory(newCategoryName, newCategoryDesc);
      toast.success('Category added');
      setNewCategoryName('');
      setNewCategoryDesc('');
      setIsCategoryModalOpen(false);
      fetchAnalyticsAndCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await DisciplineApi.deleteCategory(id);
      toast.success('Category deleted');
      fetchAnalyticsAndCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  const exportToCSV = () => {
    if (incidents.length === 0) {
      toast.error('No records to export');
      return;
    }
    const headers = ['Student ID', 'Student Name', 'Grade', 'Section', 'Date', 'Time', 'Category', 'Severity', 'Title', 'Status', 'Reporter', 'Parent Acknowledged'];
    const rows = incidents.map(inc => [
      `"${inc.student?.student_id || ''}"`,
      `"${inc.student?.fullName || ''}"`,
      `"${inc.grade?.name || ''}"`,
      `"${inc.section?.name || ''}"`,
      `"${new Date(inc.date).toLocaleDateString()}"`,
      `"${inc.time || ''}"`,
      `"${inc.categoryName}"`,
      `"${inc.severity}"`,
      `"${inc.title.replace(/"/g, '""')}"`,
      `"${inc.status}"`,
      `"${inc.reportedByName || ''}"`,
      `"${inc.parentAcknowledged ? 'Yes' : 'No'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Zetime_Discipline_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Discipline report exported to CSV');
  };

  // Severity Colors Helper
  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'LOW':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">Low</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">Medium</Badge>;
      case 'HIGH':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">High</Badge>;
      case 'CRITICAL':
        return <Badge className="bg-red-900 text-red-100 border-red-950 dark:bg-red-950 dark:text-red-200 dark:border-red-900 animate-pulse">Critical</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">Open</Badge>;
      case 'UNDER_REVIEW':
        return <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">Under Review</Badge>;
      case 'RESOLVED':
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">Resolved</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <ShieldAlert className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Student Discipline Module</h1>
              <p className="text-sm text-slate-300">
                Track, investigate, manage, and communicate student conduct and behavioral incidents
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>

          <Button
            onClick={() => {
              setCreateStep(1);
              setIsCreateOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Report Incident
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <TabsTrigger value="incidents" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Incidents Directory
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Dashboard & Analytics
          </TabsTrigger>
          {userRole === 'school_admin' && (
            <TabsTrigger value="categories" className="gap-2">
              <Layers className="w-4 h-4" />
              Custom Categories
            </TabsTrigger>
          )}
        </TabsList>

        {/* TAB 1: INCIDENTS DIRECTORY */}
        <TabsContent value="incidents" className="space-y-6 mt-6">
          {/* Quick Metrics Header Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Incidents</p>
                  <p className="text-2xl font-bold mt-1">{analytics?.total || 0}</p>
                </div>
                <div className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 rounded-lg">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Open Cases</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                    {analytics?.openCases || 0}
                  </p>
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Resolved Cases</p>
                  <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {analytics?.resolvedCases || 0}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Critical Cases</p>
                  <p className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                    {analytics?.criticalCases || 0}
                  </p>
                </div>
                <div className="p-2.5 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-lg">
                  <AlertOctagon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm col-span-2 md:col-span-1">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">This Month</p>
                  <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                    {analytics?.thisMonth || 0}
                  </p>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <Card className="border shadow-sm p-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search student, student ID, incident title, or reporter..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={severityFilter} onValueChange={(val) => setSeverityFilter(val)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Severities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button type="submit" variant="secondary">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </form>
          </Card>

          {/* Incidents Data Table */}
          <Card className="border shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-12 text-center">
                <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="text-lg font-semibold">No Discipline Records Found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  There are no incidents matching your current search and filter criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Grade & Section</th>
                      <th className="px-4 py-3">Incident Title & Category</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Parent Notified</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-3.5 font-medium">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {inc.student?.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              ID: {inc.student?.student_id}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {inc.grade?.name || 'Grade'} - {inc.section?.name || 'Section'}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{inc.title}</p>
                          <span className="inline-block mt-0.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                            {inc.categoryName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">{getSeverityBadge(inc.severity)}</td>
                        <td className="px-4 py-3.5">{getStatusBadge(inc.status)}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(inc.date).toLocaleDateString()}
                          <span className="block text-[11px] opacity-75">{inc.time}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {inc.parentAcknowledged ? (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-600 gap-1 text-[11px]">
                              <UserCheck className="w-3 h-3" /> Acknowledged
                            </Badge>
                          ) : inc.parentNotified ? (
                            <Badge variant="outline" className="border-indigo-400 text-indigo-600 text-[11px]">
                              Sent
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[11px]">Pending</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedIncident(inc);
                                setFollowUpStatus(inc.status);
                                setIsDetailOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1 text-indigo-600" />
                              Details
                            </Button>
                            {userRole === 'school_admin' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                onClick={() => handleDeleteIncident(inc.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Showing page {page} of {totalPages} ({total} total records)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 2: ANALYTICS DASHBOARD */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Top Categories Card */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Incidents by Category
                </CardTitle>
                <CardDescription>Breakdown of discipline types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics?.byCategory?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                ) : (
                  analytics?.byCategory?.map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{item.name}</span>
                        <span className="text-muted-foreground">{item.value}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (item.value / (analytics?.total || 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Repeat Offenders Card */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Students with Repeated Incidents
                </CardTitle>
                <CardDescription>Students requiring intervention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics?.repeatOffenders?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No repeat offenders recorded</p>
                ) : (
                  analytics?.repeatOffenders?.map((item) => (
                    <div key={item.student.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                      <div>
                        <p className="font-semibold text-xs">{item.student.fullName}</p>
                        <p className="text-[11px] text-muted-foreground">ID: {item.student.student_id}</p>
                      </div>
                      <Badge variant="destructive" className="font-bold">
                        {item.count} Incidents
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top Reporting Teachers Card */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Top Reporting Staff
                </CardTitle>
                <CardDescription>Staff members reporting incidents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics?.topReporters?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                ) : (
                  analytics?.topReporters?.map((rep) => (
                    <div key={rep.name} className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 dark:bg-slate-900">
                      <span className="font-medium">{rep.name}</span>
                      <Badge variant="secondary">{rep.count} reports</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: CUSTOM CATEGORIES (Admin Only) */}
        {userRole === 'school_admin' && (
          <TabsContent value="categories" className="space-y-6 mt-6">
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Discipline Categories</CardTitle>
                  <CardDescription>
                    Manage default and custom discipline categories for your school
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCategoryModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Category
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.id || cat.name}
                      className="p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-indigo-600" />
                          <h4 className="font-semibold text-sm">{cat.name}</h4>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                        )}
                        <span className="inline-block mt-2 text-[10px] uppercase font-bold text-slate-500">
                          {cat.isDefault ? 'Standard Default' : 'School Custom'}
                        </span>
                      </div>

                      {!cat.isDefault && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* CREATE INCIDENT MULTI-STEP WIZARD MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Report Discipline Incident (Step {createStep} of 5)
            </DialogTitle>
            <DialogDescription>
              Follow the wizard to file an official discipline report and notify parents
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${(createStep / 5) * 100}%` }}
            />
          </div>

          {/* STEP 1: STUDENT SELECTION */}
          {createStep === 1 && (
            <div className="space-y-4 py-2">
              <Label className="text-sm font-semibold">Step 1: Select Student</Label>
              <Input
                placeholder="Search student by name or student ID..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />

              {isLoadingStudents ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading students...</div>
              ) : students.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No students found</div>
              ) : (
                <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                  {students.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          studentId: st.id,
                          selectedStudentName: st.fullName,
                          selectedStudentGrade: `${st.grade?.name || ''} - ${st.section?.name || ''}`
                        }));
                      }}
                      className={`p-3 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        formData.studentId === st.id ? 'bg-indigo-50 dark:bg-indigo-950/60 border-l-4 border-indigo-600 font-semibold' : ''
                      }`}
                    >
                      <div>
                        <p className="text-slate-900 dark:text-slate-100 font-medium">{st.fullName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          ID: {st.student_id} | Class: {st.grade?.name || ''} {st.section?.name || ''}
                        </p>
                      </div>
                      {formData.studentId === st.id && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: INCIDENT DETAILS */}
          {createStep === 2 && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs border">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Selected Student: </span>
                {formData.selectedStudentName} ({formData.selectedStudentGrade})
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 10:25 AM"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={formData.categoryName}
                    onValueChange={(val) => {
                      const matched = categories.find((c) => c.name === val);
                      setFormData({
                        ...formData,
                        categoryName: val,
                        categoryId: matched?.id || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id || c.name} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Severity Level</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(val: any) => setFormData({ ...formData, severity: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low (Green)</SelectItem>
                      <SelectItem value="MEDIUM">Medium (Orange)</SelectItem>
                      <SelectItem value="HIGH">High (Red)</SelectItem>
                      <SelectItem value="CRITICAL">Critical (Dark Red)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Incident Title *</Label>
                <Input
                  placeholder="e.g. Disrespectful behavior towards teacher during class"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Detailed Description *</Label>
                <Textarea
                  placeholder="Provide complete facts, student statements, and observation context..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Incident Location</Label>
                  <Input
                    placeholder="e.g. Science Lab B"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Witnesses (comma separated)</Label>
                  <Input
                    placeholder="e.g. Mr. Abebe, Sara T."
                    value={formData.witnessesText}
                    onChange={(e) => setFormData({ ...formData, witnessesText: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EVIDENCE ATTACHMENTS */}
          {createStep === 3 && (
            <div className="space-y-4 py-2">
              <Label className="text-sm font-semibold">Attach Evidence (Images, PDF, Video, Documents)</Label>
              <p className="text-xs text-muted-foreground">
                Upload photos of physical evidence, handwritten notes, or PDF records.
              </p>

              <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,video/*,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="evidence-upload-input"
                />
                <label htmlFor="evidence-upload-input" className="cursor-pointer">
                  <Paperclip className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Click to upload evidence files</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports PNG, JPG, PDF, MP4 up to 50MB</p>
                </label>
              </div>

              {isUploading && <p className="text-xs text-indigo-600 animate-pulse">Attaching files...</p>}

              {formData.evidence.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground">Attached Files ({formData.evidence.length})</h4>
                  <div className="space-y-2">
                    {formData.evidence.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 border rounded-lg bg-slate-50 dark:bg-slate-900 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="truncate font-medium">{file.name}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 h-7 w-7"
                          onClick={() => handleRemoveEvidence(idx)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <Label>Immediate Action Taken</Label>
                <Input
                  placeholder="e.g. Student sent to homeroom counselor / temporary removal from lab"
                  value={formData.immediateAction}
                  onChange={(e) => setFormData({ ...formData, immediateAction: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 4: PARENT NOTIFICATION */}
          {createStep === 4 && (
            <div className="space-y-4 py-2">
              <Label className="text-sm font-semibold">Step 4: Parent Notification Options</Label>

              <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="notify-parent-check"
                    checked={formData.parentNotified}
                    onCheckedChange={(checked) => setFormData({ ...formData, parentNotified: Boolean(checked) })}
                  />
                  <div>
                    <label htmlFor="notify-parent-check" className="text-sm font-semibold cursor-pointer">
                      Send Instant Push & Portal Notification to Linked Parent
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Parents will receive a push notification on Zetime Parent app detailing this report and will be prompted to acknowledge receipt.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label>Scheduled Follow-up Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & SAVE */}
          {createStep === 5 && (
            <div className="space-y-4 py-2">
              <h3 className="text-sm font-semibold border-b pb-2">Step 5: Review & Save Incident Report</h3>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="text-muted-foreground block">Student</span>
                    <span className="font-semibold">{formData.selectedStudentName}</span>
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="text-muted-foreground block">Severity</span>
                    {getSeverityBadge(formData.severity)}
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="text-muted-foreground block">Category</span>
                    <span className="font-semibold">{formData.categoryName}</span>
                  </div>
                  <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                    <span className="text-muted-foreground block">Date & Time</span>
                    <span className="font-semibold">{formData.date} at {formData.time}</span>
                  </div>
                </div>

                <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                  <span className="text-muted-foreground block font-semibold mb-1">Title</span>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">{formData.title}</p>
                </div>

                <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                  <span className="text-muted-foreground block font-semibold mb-1">Description</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{formData.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Dialog Navigation Buttons */}
          <DialogFooter className="flex items-center justify-between gap-2 pt-4 border-t">
            {createStep > 1 ? (
              <Button variant="outline" onClick={() => setCreateStep((s) => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : <div />}

            {createStep < 5 ? (
              <Button
                onClick={() => {
                  if (createStep === 1 && !formData.studentId) {
                    toast.error('Please select a student first');
                    return;
                  }
                  if (createStep === 2 && (!formData.title || !formData.description)) {
                    toast.error('Please provide a title and description');
                    return;
                  }
                  setCreateStep((s) => s + 1);
                }}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreateIncidentSubmit} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                <Check className="w-4 h-4 mr-1" />
                Submit Incident Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INCIDENT DETAIL DRAWER / MODAL */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedIncident && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(selectedIncident.severity)}
                    {getStatusBadge(selectedIncident.status)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ID: {selectedIncident.id.slice(0, 8)}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold mt-2">
                  {selectedIncident.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Reported by <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedIncident.reportedByName || 'Staff'}</span> on {new Date(selectedIncident.date).toLocaleDateString()} at {selectedIncident.time}
                </DialogDescription>
              </DialogHeader>

              {/* Status Update Quick Bar (Admin / Teacher) */}
              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Change Incident Status:</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={selectedIncident.status === 'OPEN' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange('OPEN')}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedIncident.status === 'UNDER_REVIEW' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange('UNDER_REVIEW')}
                  >
                    Under Review
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedIncident.status === 'RESOLVED' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange('RESOLVED')}
                  >
                    Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedIncident.status === 'CLOSED' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange('CLOSED')}
                  >
                    Closed
                  </Button>
                </div>
              </div>

              {/* Detailed Student & Incident Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 border rounded-lg">
                  <span className="text-muted-foreground block">Student</span>
                  <span className="font-semibold">{selectedIncident.student?.fullName}</span>
                </div>
                <div className="p-3 border rounded-lg">
                  <span className="text-muted-foreground block">Student ID</span>
                  <span className="font-mono">{selectedIncident.student?.student_id}</span>
                </div>
                <div className="p-3 border rounded-lg">
                  <span className="text-muted-foreground block">Grade & Section</span>
                  <span>{selectedIncident.grade?.name} {selectedIncident.section?.name}</span>
                </div>
                <div className="p-3 border rounded-lg">
                  <span className="text-muted-foreground block">Category</span>
                  <span className="font-semibold text-indigo-600">{selectedIncident.categoryName}</span>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detailed Description</h4>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedIncident.description}
                </p>
              </div>

              {/* Actions & Immediate Response */}
              {selectedIncident.immediateAction && (
                <div className="p-3 border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl space-y-1">
                  <h4 className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">Immediate Action Taken</h4>
                  <p className="text-xs text-indigo-800 dark:text-indigo-200">{selectedIncident.immediateAction}</p>
                </div>
              )}

              {/* Evidence Attachments */}
              {selectedIncident.evidence && Array.isArray(selectedIncident.evidence) && selectedIncident.evidence.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence Attachments ({selectedIncident.evidence.length})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedIncident.evidence.map((att: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewAttachment(att)}
                        className="p-3 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center gap-2 text-xs"
                      >
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="truncate font-medium">{att.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-auto text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parent Acknowledgement Status Box */}
              <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parent Acknowledgement</span>
                  {selectedIncident.parentAcknowledged ? (
                    <Badge className="bg-emerald-600 text-white">Acknowledged</Badge>
                  ) : (
                    <Badge variant="outline">Pending Parent Acknowledgment</Badge>
                  )}
                </div>

                {selectedIncident.parentAcknowledged && (
                  <div className="text-xs space-y-1 border-t pt-2 mt-2">
                    <p className="text-muted-foreground">
                      Acknowledged on: {new Date(selectedIncident.parentAcknowledgedAt!).toLocaleString()}
                    </p>
                    {selectedIncident.parentAcknowledgementNotes && (
                      <p className="italic text-slate-800 dark:text-slate-200">
                        &quot;{selectedIncident.parentAcknowledgementNotes}&quot;
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Follow-up Timeline & New Entry */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Follow-up History & Actions</h4>

                {selectedIncident.followUps && selectedIncident.followUps.length > 0 && (
                  <div className="space-y-3 max-h-48 overflow-y-auto border rounded-xl p-3 divide-y">
                    {selectedIncident.followUps.map((fu) => (
                      <div key={fu.id} className="pt-2 first:pt-0 text-xs space-y-1">
                        <div className="flex items-center justify-between font-medium">
                          <span>{fu.authorName || 'Staff'}</span>
                          <span className="text-muted-foreground">{new Date(fu.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{fu.note}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Follow-up Form */}
                <div className="p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <Textarea
                    placeholder="Add follow-up note or resolution details..."
                    rows={2}
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <Select value={followUpStatus} onValueChange={(v) => setFollowUpStatus(v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Keep Open</SelectItem>
                        <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                        <SelectItem value="RESOLVED">Set Resolved</SelectItem>
                        <SelectItem value="CLOSED">Set Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      onClick={handleAddFollowUpSubmit}
                      disabled={isSubmittingFollowUp || !followUpNote.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Add Note
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CATEGORY MANAGEMENT MODAL */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Discipline Category</DialogTitle>
            <DialogDescription>Create a custom discipline classification for your school</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Category Name *</Label>
              <Input
                placeholder="e.g. Lab Safety Violation"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Description (Optional)</Label>
              <Input
                placeholder="Short description..."
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} className="bg-indigo-600 hover:bg-indigo-500">
              Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EVIDENCE PREVIEW MODAL */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.name}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {previewAttachment?.type?.startsWith('image/') ? (
              <img src={previewAttachment.url} alt={previewAttachment.name} className="max-h-[60vh] mx-auto rounded-lg object-contain" />
            ) : previewAttachment?.type?.startsWith('video/') ? (
              <video src={previewAttachment.url} controls className="max-h-[60vh] w-full rounded-lg" />
            ) : (
              <iframe src={previewAttachment?.url} className="w-full h-[60vh] rounded-lg border" title={previewAttachment?.name} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
