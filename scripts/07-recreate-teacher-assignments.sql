-- Drop the existing teacher_assignments table and create a new one matching the form fields
DROP TABLE IF EXISTS public.teacher_assignments CASCADE;

CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  grade VARCHAR(2) NOT NULL,
  section VARCHAR(1) NOT NULL,
  stream VARCHAR(20) NOT NULL,
  subject VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_teacher_assignments_school_id ON public.teacher_assignments(school_id);
CREATE INDEX idx_teacher_assignments_teacher_id ON public.teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_grade_section_stream ON public.teacher_assignments(grade, section, stream);

-- Add unique constraint to prevent duplicate assignments
ALTER TABLE public.teacher_assignments 
ADD CONSTRAINT unique_teacher_assignment_per_class 
UNIQUE(school_id, teacher_id, grade, section, stream);
