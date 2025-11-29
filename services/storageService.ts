
import { User, StudySet, Group, ThemeId, Binder } from "../types";

const KEYS = {
  USER: 'forge_user',
  SETS: 'forge_sets',
  BINDERS: 'forge_binders',
  GROUPS: 'forge_groups',
  THEME: 'forge_theme'
};

// Helper to simulate async delay for realism
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const StorageService = {
  // --- Auth & User ---

  async getCurrentUser(): Promise<User | null> {
    await delay(500);
    const userStr = localStorage.getItem(KEYS.USER);
    if (userStr) return JSON.parse(userStr);
    return null;
  },

  async login(email: string, password: string): Promise<{ user: User | null, error: string | null }> {
    await delay(1000);
    // Mock Login: In reality, just creates a new session for any credentials
    const user = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        name: email.split('@')[0],
        email,
        xp: 1250,
        level: 5,
        streak: 3,
        joinedGroups: [],
        preferredTheme: 'galactic' as ThemeId
    };
    
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return { user, error: null };
  },
  
  async loginWithGoogle(): Promise<{ error: string | null }> {
      // Mock Google Login
      await delay(1000);
      return { error: "Google Login is not available in Offline Mode." };
  },

  async signup(email: string, password: string, name: string): Promise<{ user: User | null, error: string | null }> {
    await delay(1000);
    const user = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      name,
      email,
      xp: 0,
      level: 1,
      streak: 1,
      joinedGroups: [],
      preferredTheme: 'galactic' as ThemeId
    };
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return { user, error: null };
  },

  async logout() {
    await delay(500);
    localStorage.removeItem(KEYS.USER);
  },

  async saveUser(user: User) {
    await delay(300);
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },

  async updateUserXP(amount: number): Promise<User | null> {
    const user = await StorageService.getCurrentUser();
    if (user) {
      user.xp += amount;
      const newLevel = Math.floor(user.xp / 100) + 1;
      if (newLevel > user.level) {
        user.level = newLevel;
      }
      await StorageService.saveUser(user);
      return user;
    }
    return null;
  },

  async updateUserTheme(themeId: ThemeId): Promise<User | null> {
    const user = await StorageService.getCurrentUser();
    if (user) {
      user.preferredTheme = themeId;
      await StorageService.saveUser(user);
      return user;
    }
    return null;
  },

  // --- Study Sets ---

  async getStudySets(): Promise<StudySet[]> {
    await delay(500);
    const setsStr = localStorage.getItem(KEYS.SETS);
    if (!setsStr) return [];
    try {
        const parsed = JSON.parse(setsStr);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
  },

  async saveStudySet(set: StudySet) {
    await delay(500);
    const sets = await StorageService.getStudySets();
    sets.unshift(set); // Add to beginning
    localStorage.setItem(KEYS.SETS, JSON.stringify(sets));
  },

  async updateStudySet(updatedSet: StudySet) {
    await delay(500);
    const sets = await StorageService.getStudySets();
    const index = sets.findIndex(s => s.id === updatedSet.id);
    if (index !== -1) {
      sets[index] = updatedSet;
      localStorage.setItem(KEYS.SETS, JSON.stringify(sets));
    }
  },

  // --- Binders (Folders) ---
  
  async getBinders(): Promise<Binder[]> {
      await delay(300);
      const str = localStorage.getItem(KEYS.BINDERS);
      if (!str) return [];
      try {
          return JSON.parse(str);
      } catch { return []; }
  },

  async createBinder(title: string, initialSetIds: string[] = []): Promise<Binder> {
      const binders = await StorageService.getBinders();
      const newBinder: Binder = {
          id: 'binder_' + Math.random().toString(36).substr(2, 9),
          title,
          setIds: initialSetIds,
          createdAt: Date.now(),
          color: ['#14b8a6', '#9966f1', '#34c55e', '#f43f5e'][Math.floor(Math.random()*4)]
      };
      binders.unshift(newBinder);
      localStorage.setItem(KEYS.BINDERS, JSON.stringify(binders));
      return newBinder;
  },

  // --- Groups ---

  async getGroups(): Promise<Group[]> {
    await delay(500);
    const groupsStr = localStorage.getItem(KEYS.GROUPS);
    if (!groupsStr) return [];
    try {
        const parsed = JSON.parse(groupsStr);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
  },

  async createGroup(name: string, userId: string): Promise<Group | null> {
    await delay(800);
    const groups = await StorageService.getGroups();
    
    const newGroup: Group = {
      id: 'group_' + Math.random().toString(36).substr(2, 9),
      name,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      members: [userId],
      sharedSets: []
    };

    groups.push(newGroup);
    localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));
    
    // Update User's joined groups
    const user = await StorageService.getCurrentUser();
    if (user) {
        user.joinedGroups.push(newGroup.id);
        await StorageService.saveUser(user);
    }

    return newGroup;
  },
  
  async joinGroup(inviteCode: string, userId: string): Promise<boolean> {
    await delay(800);
    const groups = await StorageService.getGroups();
    const group = groups.find(g => g.inviteCode === inviteCode);
    
    if (group && !group.members.includes(userId)) {
        group.members.push(userId);
        localStorage.setItem(KEYS.GROUPS, JSON.stringify(groups));

        // Update User
        const user = await StorageService.getCurrentUser();
        if (user) {
            user.joinedGroups.push(group.id);
            await StorageService.saveUser(user);
        }
        return true;
    }
    return false;
  }
};
