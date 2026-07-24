import { DisciplineManagement } from '@/components/school/discipline/discipline-management';

export default function TeacherDisciplinePage() {
  return (
    <div className="p-4 md:p-8">
      <DisciplineManagement userRole="teacher" />
    </div>
  );
}
