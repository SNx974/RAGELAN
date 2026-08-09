import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
  }).format(typeof date === 'string' ? new Date(date) : date);
}

export function initials(firstName: string, lastName: string) {
  return `${firstName.at(0) ?? ''}${lastName.at(0) ?? ''}`.toUpperCase();
}

/** Âge révolu — sert au contrôle « mineur » côté serveur. */
export function ageFrom(birthDate: Date | string) {
  const d = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
