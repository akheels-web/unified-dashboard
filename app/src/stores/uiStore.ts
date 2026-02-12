import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification } from '@/types';

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;

  // Theme
  theme: 'dark' | 'light';
  brandColor: string;

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Modals
  activeModal: string | null;
  modalData: any;

  // Loading states
  globalLoading: boolean;
  loadingMessage: string;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (value: boolean) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setBrandColor: (color: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;
  setGlobalLoading: (value: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileMenuOpen: false,
      theme: 'dark' as 'dark' | 'light',
      brandColor: '196 67% 45%', // Default blue
      notifications: [],
      unreadCount: 0,
      activeModal: null,
      modalData: null,
      globalLoading: false,
      loadingMessage: '',

      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),

      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),

      toggleMobileMenu: () => set((state) => ({
        mobileMenuOpen: !state.mobileMenuOpen
      })),

      setMobileMenuOpen: (value) => set({ mobileMenuOpen: value }),

      setTheme: (theme) => set({ theme }),

      setBrandColor: (color) => set({ brandColor: color }),

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },

      markNotificationRead: (id) => set((state) => {
        const notification = state.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
          return {
            notifications: state.notifications.map(n =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        }
        return state;
      }),

      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      })),

      removeNotification: (id) => set((state) => {
        const notification = state.notifications.find(n => n.id === id);
        return {
          notifications: state.notifications.filter(n => n.id !== id),
          unreadCount: notification && !notification.read
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
        };
      }),

      openModal: (modal, data) => set({
        activeModal: modal,
        modalData: data
      }),

      closeModal: () => set({
        activeModal: null,
        modalData: null
      }),

      setGlobalLoading: (value, message = '') => set({
        globalLoading: value,
        loadingMessage: message
      }),
    }),
    {
      name: 'ui-storage',
      partialize: (state: UIState) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        brandColor: state.brandColor
      }), // Only persist theme, sidebar and brand color
    }
  )
);
