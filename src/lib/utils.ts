import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-NP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
