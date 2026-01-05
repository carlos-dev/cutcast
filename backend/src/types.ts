// Status possíveis de um VideoJob
export type JobStatus = 'UPLOADED' | 'PROCESSING' | 'DONE' | 'FAILED';

// Estrutura de um VideoJob em memória
export interface VideoJob {
  id: string;
  status: JobStatus;
  originalFilename: string;
  createdAt: Date;
}
