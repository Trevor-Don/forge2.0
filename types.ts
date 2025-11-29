
export interface User {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  joinedGroups: string[]; // Group IDs
  preferredTheme?: string;
  isGoogleLinked?: boolean; // Google Account Status
}

export interface FlashcardSRS {
  interval: number; // Days until next review
  repetitions: number; // Consecutive correct answers
  nextReview: number; // Timestamp of next review
}

export interface Flashcard {
  front: string;
  back: string;
  visualAnalogy?: string; // Text description of a visual
  imageUrl?: string; // Base64 or URL of generated image
  diagram?: string; // Mermaid.js code
  srs?: FlashcardSRS;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface StudySet {
  id: string;
  title: string;
  description: string;
  summary: string; // Markdown
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  podcastScript?: string; // Generated podcast dialogue
  createdBy: string;
  createdAt: number;
  tags: string[];
  binderId?: string; // Link to a Binder/Folder
}

export interface Binder {
  id: string;
  title: string;
  setIds: string[];
  createdAt: number;
  color?: string; // UI decoration
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  members: string[]; // User IDs
  sharedSets: string[]; // StudySet IDs
}

export enum StudyMode {
  NOTES = 'NOTES',
  FLASHCARDS = 'FLASHCARDS',
  QUIZ = 'QUIZ',
  CHAT = 'CHAT',
  GRAPH = 'GRAPH',
  PODCAST = 'PODCAST',
}

export interface PodcastConfig {
  tone: 'Casual' | 'Formal' | 'Humorous' | 'Debate';
  length: 'Short' | 'Medium' | 'Long';
}

export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export type ThemeId = 'galactic' | 'ocean' | 'forest' | 'sunset';

export interface Theme {
  id: ThemeId;
  name: string;
  colors: {
    bg: string; // R G B
    card: string; // R G B
    accent: string; // R G B
    secondary: string; // R G B
  };
}
