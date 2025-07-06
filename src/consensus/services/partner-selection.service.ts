import { Injectable } from '@nestjs/common';
import { ProcessState, ProcessId } from '../types';
import { ColorSelectionService } from './color-selection.service';

/**
 * Service responsible for partner selection and scoring logic
 */
@Injectable()
export class PartnerSelectionService {
  
  constructor(private colorSelectionService: ColorSelectionService) {}

  /**
   * Choose the best partner for a process using advanced scoring
   */
  choosePartner(process: ProcessState, allProcesses: ProcessState[]): void {
    const otherProcesses = allProcesses.filter(p => 
      p.id !== process.id && !p.isDone
    );

    if (otherProcesses.length === 0) {
      process.partner = null;
      return;
    }

    // Improved partner selection: prefer processes that likely have what we want
    // and don't want what we're trying to collect
    let bestPartner: ProcessState | null = null;
    let bestScore = -1;

    for (const candidate of otherProcesses) {
      const score = this.calculatePartnerScore(process, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestPartner = candidate;
      }
    }

    // Fallback to round-robin if no clear preference
    if (!bestPartner || bestScore <= 0) {
      const currentPartnerIndex = process.partner ? 
        otherProcesses.findIndex(p => p.id === process.partner) : -1;
      
      const nextIndex = (currentPartnerIndex + 1) % otherProcesses.length;
      process.partner = otherProcesses[nextIndex].id;
    } else {
      process.partner = bestPartner.id;
    }

    console.log(`Process ${process.id} chose partner ${process.partner} (score: ${bestScore})`);
  }

  /**
   * Calculate how good a potential partner is for this process
   * Higher score = better partner choice
   */
  calculatePartnerScore(process: ProcessState, candidate: ProcessState): number {
    if (!process.wanted) return 0;

    let score = 0;
    
    // Positive score: candidate has balls of the color we want
    const candidateColorCount = candidate.stack.filter(c => c === process.wanted).length;
    score += candidateColorCount * 3; // Strong positive factor
    
    // Negative score: candidate wants the same color we want (conflict)
    if (candidate.wanted === process.wanted) {
      score -= 20; // Strong penalty for conflict
    }
    
    // Positive score: we have balls of the color the candidate wants
    if (candidate.wanted) {
      // const ourColorCount = process.stack.filter(c => c === candidate.wanted).length;
      const unwantedByUs = process.stack.filter(c => c === candidate.wanted && c !== process.wanted).length;
      score += unwantedByUs * 2; // We can help them, good mutual exchange
    }
    
    return score;
  }
}
