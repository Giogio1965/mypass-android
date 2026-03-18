
export interface PasswordEntry {
    id: string;
    site: string;
    username: string;
    passwordValue: string;
    category: string;
    categoryIcon?: string; // New field for custom icon name
    url?: string; // New explicit URL field
    createdAt: number;
    updatedAt: number;
    notes?: string;
}

export enum DefaultCategory {
    SOCIAL = 'Social',
    LAVORO = 'Lavoro',
    BANCA = 'Banca',
    EMAIL = 'Email',
    SHOPPING = 'Shopping',
    ALTRO = 'Altro'
}

export enum AppView {
    LOGIN = 'LOGIN',
    VAULT = 'VAULT',
    ADD_EDIT = 'ADD_EDIT',
    SECURITY = 'SECURITY'
}