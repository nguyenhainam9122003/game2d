import { create } from "zustand";

export const AVATAR_EMOJIS = ["🐯", "🐼", "🐸", "🦊", "🐙", "🦁", "🐨", "🐰", "🐶", "🐱"];

interface ProfileData {
  avatar: string;
  nickname: string;
}

interface ProfileState extends ProfileData {
  setAvatar(v: string): void;
  setNickname(v: string): void;
}

const STORAGE_KEY = "ra-choi:profile";

function randomDefault(): ProfileData {
  const avatar = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
  const nickname = `Người chơi ${Math.floor(1000 + Math.random() * 9000)}`;
  return { avatar, nickname };
}

function persist(data: ProfileData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadInitial(): ProfileData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupt/blocked storage — fall back to a fresh random profile below
  }
  const fresh = randomDefault();
  persist(fresh);
  return fresh;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...loadInitial(),
  setAvatar: (avatar) => {
    set({ avatar });
    persist({ ...get(), avatar });
  },
  setNickname: (nickname) => {
    set({ nickname });
    persist({ ...get(), nickname });
  },
}));
