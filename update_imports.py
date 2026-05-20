import os
import re

# Define the mapping of old import paths to new ones
# The mapping should be as specific as possible to avoid false positives
mappings = {
    # Components -> Auth
    r'@/components/admin-signup-form': '@/components/auth/admin-signup-form',
    r'@/components/auth-wrapper': '@/components/auth/auth-wrapper',
    r'@/components/forgot-password-form': '@/components/auth/forgot-password-form',
    r'@/components/login-form': '@/components/auth/login-form',
    r'@/components/registration-selection': '@/components/auth/registration-selection',
    r'@/components/reset-password-form': '@/components/auth/reset-password-form',
    r'@/components/signup-form': '@/components/auth/signup-form',
    r'@/components/teacher-signup-form': '@/components/auth/teacher-signup-form',
    
    # Components -> School
    r'@/components/attendance-tracking': '@/components/school/attendance-tracking',
    r'@/components/dashboard': '@/components/school/dashboard',
    r'@/components/quick-actions': '@/components/school/quick-actions',
    r'@/components/reports': '@/components/school/reports',
    r'@/components/school-setup': '@/components/school/school-setup',
    r'@/components/student-management': '@/components/school/student-management',
    r'@/components/teacher-assignment-management': '@/components/school/teacher-assignment-management',
    r'@/components/teacher-management': '@/components/school/teacher-management',
    r'@/components/user-profile': '@/components/school/user-profile',
    r'@/components/teacher-view': '@/components/school/teacher-view',
    r'@/components/settings': '@/components/school/settings',
    r'@/components/email-settings': '@/components/school/email-settings',
    r'@/components/email-setup-guide': '@/components/school/email-setup-guide',
    r'@/components/email-status': '@/components/school/email-status',
    r'@/components/email-password-dialog': '@/components/school/email-password-dialog',
    r'@/components/admin-panel': '@/components/school/admin-panel',
    r'@/components/settings-panel': '@/components/school/settings-panel',

    # Components -> Layout
    r'@/components/header': '@/components/layout/header',
    r'@/components/navigation': '@/components/layout/navigation',
    r'@/components/offline-indicator': '@/components/layout/offline-indicator',
    r'@/components/theme-provider': '@/components/layout/theme-provider',
    
    # Components -> System
    r'@/components/error-boundary': '@/components/system/error-boundary',
    r'@/components/pwa-install': '@/components/system/pwa-install',
    r'@/components/sync-manager': '@/components/system/sync-manager',
    
    # Lib -> DB
    r'@/lib/database': '@/lib/db/database',
    r'@/lib/db': '@/lib/db/db',
    r'@/lib/mock-db': '@/lib/db/mock-db',
    r'@/lib/local-storage': '@/lib/db/local-storage',
    r'@/lib/sync-queue': '@/lib/db/sync-queue',
    
    # Lib -> Auth
    r'@/lib/auth': '@/lib/auth/auth',
    r'@/lib/supabase-auth': '@/lib/auth/supabase-auth',
    r'@/lib/super-admin-auth': '@/lib/auth/super-admin-auth',
    
    # Lib -> Utils
    r'@/lib/pricing-utils': '@/lib/utils/pricing-utils',
    r'@/lib/parse-json-response': '@/lib/utils/parse-json-response',
    r'@/lib/school-id-generator': '@/lib/utils/school-id-generator',
    r'@/lib/error-handler': '@/lib/utils/error-handler',
    r'@/lib/validation': '@/lib/utils/validation',
    r'@/lib/validators': '@/lib/utils/validators',
    r'@/lib/utils': '@/lib/utils/utils',
    r'@/lib/rate-limit': '@/lib/utils/rate-limit',
    r'@/lib/api-client': '@/lib/utils/api-client',
    r'@/lib/subscription-types': '@/lib/utils/subscription-types',
    r'@/lib/supabase-server': '@/lib/utils/supabase-server',
    r'@/lib/supabase': '@/lib/utils/supabase',
    r'@/lib/notifications': '@/lib/utils/notifications',
}

def update_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in mappings.items():
        # Ensure we match full paths or paths ending in quotes/slashes
        # But for @/ alias, we can be quite direct
        new_content = new_content.replace(old, new)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {file_path}")

def walk_and_update(root_dir):
    for root, dirs, files in os.walk(root_dir):
        if '.next' in root or 'node_modules' in root or '.git' in root:
            continue
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                update_file(os.path.join(root, file))

if __name__ == "__main__":
    project_root = "." # Run from project root
    walk_and_update(project_root)
    print("Update complete.")
