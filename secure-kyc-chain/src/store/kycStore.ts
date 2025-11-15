import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { adminApi } from '@/lib/api';

export interface KYCApplication {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dob?: string;
  address?: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_review';
  submittedAt: string;
  riskScore: number;
  faceMatchScore?: number;
  documents: {
    pan?: string;
    aadhaar?: string;
    passport?: string;
  };
  ocrData?: {
    extractedText?: string;
    fields?: {
      name?: string;
      dob?: string;
      idNumber?: string;
      address?: string;
    };
  };
  reviewer?: string;
  history?: Array<{
    timestamp: string;
    action: string;
    reviewer?: string;
  }>;
}

interface Settings {
  darkMode: boolean;
  notifications: {
    fraudAlerts: boolean;
    autoApprovalAlerts: boolean;
    reviewQueueAlerts: boolean;
  };
  profile: {
    name: string;
    email: string;
  };
}

interface KYCStore {
  applications: KYCApplication[];
  settings: Settings;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchApplications: () => Promise<void>;
  setApplications: (applications: KYCApplication[]) => void;
  updateApplication: (id: string, updates: Partial<KYCApplication>) => void;
  approveApplication: (id: string, reviewer: string) => Promise<void>;
  rejectApplication: (id: string, reviewer: string) => Promise<void>;
  
  // Settings
  setDarkMode: (enabled: boolean) => void;
  updateNotificationSettings: (notifications: Partial<Settings['notifications']>) => void;
  updateProfile: (profile: Partial<Settings['profile']>) => void;
}

export const useKYCStore = create<KYCStore>()(
  persist(
    (set, get) => ({
      applications: [],
      settings: {
        darkMode: false,
        notifications: {
          fraudAlerts: true,
          autoApprovalAlerts: true,
          reviewQueueAlerts: true,
        },
        profile: {
          name: 'Admin User',
          email: 'admin@identiq.com',
        },
      },
      loading: false,
      error: null,

      fetchApplications: async () => {
        set({ loading: true, error: null });
        try {
          const apps = await adminApi.getApplications();
          // Transform API response to match our KYCApplication interface
          const transformedApps = apps.map((app: any) => ({
            id: app.id,
            name: app.user_details?.name || app.extracted_data?.name || app.user?.email?.split('@')[0] || 'Unknown User',
            email: app.user?.email || '',
            phone: app.user?.phone || '',
            dob: app.user_details?.date_of_birth || '',
            address: app.user_details?.address || app.extracted_data?.address || '',
            status: (() => {
              const status = app.status?.toLowerCase() || '';
              if (status === 'verified') return 'approved';
              if (status === 'in_review' || status === 'processing' || status === 'uploaded') return 'in_review';
              if (status === 'rejected') return 'rejected';
              return 'pending';
            })() as 'pending' | 'approved' | 'rejected' | 'in_review',
            submittedAt: app.created_at || new Date().toISOString(),
            riskScore: app.risk_score !== undefined && app.risk_score !== null
              ? (app.risk_score <= 1 ? Math.round(app.risk_score * 100) : Math.round(app.risk_score))
              : 0,
            faceMatchScore: app.face_match_score !== undefined && app.face_match_score !== null 
              ? (app.face_match_score <= 1 ? Math.round(app.face_match_score * 100) : Math.round(app.face_match_score))
              : undefined,
            documents: {
              pan: app.documents?.find((d: any) => d.doc_type?.includes('PAN') || d.doc_type === 'PAN_CARD')?.file_path || '',
              aadhaar: app.documents?.find((d: any) => d.doc_type?.includes('AADHAAR') || d.doc_type === 'AADHAAR')?.file_path || '',
              passport: app.documents?.find((d: any) => d.doc_type?.includes('PASSPORT') || d.doc_type === 'PASSPORT')?.file_path || '',
            },
            ocrData: (() => {
              // Try to get extracted data from documents first
              const idDoc = app.documents?.find((d: any) => d.doc_type !== 'SELFIE');
              const extractedData = idDoc?.extracted_data || app.extracted_data || {};
              
              // Handle if extracted_data is a string (JSON)
              let parsedData = extractedData;
              if (typeof extractedData === 'string') {
                try {
                  parsedData = JSON.parse(extractedData);
                } catch {
                  parsedData = {};
                }
              }
              
              return {
                extractedText: parsedData?.raw_text || parsedData?.extractedText || '',
                fields: {
                  name: parsedData?.name || app.user_details?.name || '',
                  dob: parsedData?.dob || parsedData?.date_of_birth || app.user_details?.date_of_birth || '',
                  idNumber: parsedData?.id_number || parsedData?.documentNumber || '',
                  address: parsedData?.address || app.user_details?.address || '',
                },
              };
            })(),
            reviewer: app.reviewer_comment?.includes('by') ? app.reviewer_comment.split('by')[1]?.trim() : app.reviewer_comment || '',
            history: app.audit_trail || [],
          }));
          set({ applications: transformedApps, loading: false });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch applications', loading: false });
          console.error('Error fetching applications:', error);
        }
      },

      setApplications: (applications) => set({ applications }),

      updateApplication: (id, updates) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id ? { ...app, ...updates } : app
          ),
        })),

      approveApplication: async (id, reviewer) => {
        try {
          await adminApi.approveApplication(id, `Approved by ${reviewer}`);
          // Refresh applications after approval
          await get().fetchApplications();
        } catch (error: any) {
          console.error('Error approving application:', error);
          throw error;
        }
      },

      rejectApplication: async (id, reviewer) => {
        try {
          await adminApi.rejectApplication(id, `Rejected by ${reviewer}`);
          // Refresh applications after rejection
          await get().fetchApplications();
        } catch (error: any) {
          console.error('Error rejecting application:', error);
          throw error;
        }
      },

      setDarkMode: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, darkMode: enabled },
        })),

      updateNotificationSettings: (notifications) =>
        set((state) => ({
          settings: {
            ...state.settings,
            notifications: { ...state.settings.notifications, ...notifications },
          },
        })),

      updateProfile: (profile) =>
        set((state) => ({
          settings: {
            ...state.settings,
            profile: { ...state.settings.profile, ...profile },
          },
        })),
    }),
    {
      name: 'identiq-kyc-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        // Don't persist applications - always fetch fresh from API
      }),
    }
  )
);

