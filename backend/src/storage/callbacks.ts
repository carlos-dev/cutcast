import { JobCallback } from '../types';

// Armazenamento em memória dos callbacks recebidos
export const callbacks = new Map<string, JobCallback>();

