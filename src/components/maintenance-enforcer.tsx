
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSiteSettings, type SiteSettings } from '@/data/settings';

export default function MaintenanceEnforcer() {
  const pathname = usePathname();
  const router = useRouter();
  
  // We only fetch settings once on the client-side to avoid re-running on every navigation
  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      // Skip check for admin, maintenance page itself, or API routes
      if (pathname.startsWith('/admin') || pathname.startsWith('/maintenance') || pathname.startsWith('/api')) {
        return;
      }

      try {
        const settings = await getSiteSettings();
        
        const maintenanceActive = settings.maintenance_active === 'true';
        if (!maintenanceActive) {
            return;
        }

        const now = new Date();
        const startTime = settings.maintenance_start ? new Date(settings.maintenance_start) : null;
        const endTime = settings.maintenance_end ? new Date(settings.maintenance_end) : null;

        let isMaintenanceWindow = false;
        if (startTime) {
            if (endTime) {
                // Window with start and end
                if (now >= startTime && now <= endTime) {
                    isMaintenanceWindow = true;
                }
            } else {
                // Window with only a start time (active indefinitely from that point)
                if (now >= startTime) {
                    isMaintenanceWindow = true;
                }
            }
        } else {
            // No schedule defined, so maintenance is active immediately
            isMaintenanceWindow = true;
        }

        if (isMaintenanceWindow) {
          // Using replace to not add the blocked page to browser history
          router.replace('/maintenance');
        }

      } catch (error) {
        console.error("Failed to check maintenance status:", error);
      }
    };

    checkMaintenanceStatus();
  }, [pathname, router]);

  return null; // This component does not render anything
}
