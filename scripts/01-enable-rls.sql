-- Enable Row Level Security for all tables and create security policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own record" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own record" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users in their school" 
  ON public.users FOR SELECT 
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    AND school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

-- Schools table policies
CREATE POLICY "Users can view their own school" 
  ON public.schools FOR SELECT 
  USING (
    admin_id = auth.uid() 
    OR id IN (
      SELECT school_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their school" 
  ON public.schools FOR UPDATE 
  USING (admin_id = auth.uid());

-- Classes table policies
CREATE POLICY "Users can view classes in their school" 
  ON public.classes FOR SELECT 
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can insert classes in their school" 
  ON public.classes FOR INSERT 
  WITH CHECK (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Students table policies
CREATE POLICY "Users can view students in their school" 
  ON public.students FOR SELECT 
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Teachers can insert students in their school" 
  ON public.students FOR INSERT 
  WITH CHECK (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Teachers can update students in their school" 
  ON public.students FOR UPDATE 
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

-- Attendance table policies
CREATE POLICY "Users can view attendance in their school" 
  ON public.attendance FOR SELECT 
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Teachers can record attendance in their school" 
  ON public.attendance FOR INSERT 
  WITH CHECK (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Teachers can update attendance in their school" 
  ON public.attendance FOR UPDATE 
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

-- Attendance reports policies
CREATE POLICY "Users can view reports for their school" 
  ON public.attendance_reports FOR SELECT 
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

-- Email settings policies
CREATE POLICY "Admins can view email settings for their school" 
  ON public.email_settings FOR SELECT 
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update email settings for their school" 
  ON public.email_settings FOR UPDATE 
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
