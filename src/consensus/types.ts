export type Color = 'R' | 'G' | 'B';
export type ProcessId = 1 | 2 | 3;

export interface ProcessState {
  id: ProcessId;
  stack: Color[];
  wanted: Color | null;
  partner: ProcessId | null;
  isDone: boolean;
  isActive: boolean;
}

export interface Message {
  type: 'REQUEST' | 'SEND' | 'DONE';
  from: ProcessId;
  to: ProcessId;
  color?: Color;
  timestamp: number;
}

export interface SystemState {
  processes: ProcessState[];
  messages: Message[];
  isComplete: boolean;
  totalExchanges: number;
}

export interface BallExchange {
  from: ProcessId;
  to: ProcessId;
  color: Color;
  timestamp: number;
}
