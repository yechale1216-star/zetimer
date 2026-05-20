import prisma from '../config/db';

const DEFAULT_SETTINGS = {
  school_name: '',
  school_phone: '',
  school_address: '',
  academic_year: new Date().getFullYear().toString(),
  attendance_mode: 'daily',
  attendance_ui_type: 'card_based',
  attendance_threshold: 75,
  allow_late_mark: true,
  email_notifications: true,
  sms_notifications: false,
  notification_time: '16:00',
};

export const getSettings = async (schoolId: string) => {
  let settings = await prisma.schoolSettings.findUnique({ where: { school_id: schoolId } });
  if (!settings) {
    // Auto-create defaults on first access
    settings = await prisma.schoolSettings.create({
      data: { ...DEFAULT_SETTINGS, school_id: schoolId },
    });
  }
  return settings;
};

export const updateSettings = async (schoolId: string, data: any) => {
  return await prisma.schoolSettings.upsert({
    where: { school_id: schoolId },
    create: { ...DEFAULT_SETTINGS, ...data, school_id: schoolId },
    update: data,
  });
};
