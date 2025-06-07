import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeSentences(text: string): string {
  return text.replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase())
}
