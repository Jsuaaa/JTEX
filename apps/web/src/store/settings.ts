import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'comfortable';
export type PaperTone = 'cream' | 'white';
export type EditorFont = 'JetBrains Mono' | 'IBM Plex Mono' | 'Fira Code' | 'Iosevka';

export type SettingsStore = {
  theme: Theme;
  accent: string;
  density: Density;
  paperTone: PaperTone;
  editorFont: EditorFont;
  showLineNumbers: boolean;
  autoCompile: boolean;
  rememberProject: boolean;
  autocompleteEnabled: boolean;

  set: <K extends keyof Omit<SettingsStore, 'set'>>(key: K, value: SettingsStore[K]) => void;
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      accent: '#d97757',
      density: 'comfortable',
      paperTone: 'cream',
      editorFont: 'JetBrains Mono',
      showLineNumbers: true,
      autoCompile: false,
      rememberProject: false,
      autocompleteEnabled: true,
      set: (key, value) => set({ [key]: value } as Partial<SettingsStore>),
    }),
    {
      name: 'jtex-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const ACCENT_OPTIONS = ['#d97757', '#3b82f6', '#10b981', '#a855f7'] as const;
