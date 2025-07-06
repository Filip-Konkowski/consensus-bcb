import { Injectable } from '@nestjs/common';
import { Message, ProcessState, Color } from '../types';

/**
 * Service responsible for message handling and processing logic
 */
@Injectable()
export class MessageHandlingService {
  
  /**
   * Send a REQUEST message to the current partner
   */
  sendRequest(process: ProcessState, messageQueue: Message[]): void {
    if (!process.partner || !process.wanted) return;

    const message: Message = {
      type: 'REQUEST',
      from: process.id,
      to: process.partner,
      color: process.wanted,
      timestamp: Date.now()
    };

    messageQueue.push(message);
  }

  /**
   * Handle REQUEST message: check if we have the requested color
   */
  handleRequest(
    message: Message, 
    recipient: ProcessState, 
    sender: ProcessState,
    messageQueue: Message[],
    onMonochromeCheck: (process: ProcessState) => void,
    onComputeWantedColor: (process: ProcessState) => void,
    onChoosePartner: (process: ProcessState) => void
  ): void {
    if (!message.color) return;

    const requestedColor = message.color;
    console.log(`Process ${recipient.id} received request for ${requestedColor} from Process ${sender.id}`);
    console.log(`   Process ${recipient.id} wants: ${recipient.wanted}, has: [${recipient.stack.join(',')}]`);
    
    // Find a ball of the requested color that we don't want
    const ballIndex = recipient.stack.findIndex((color: Color) => 
      color === requestedColor && color !== recipient.wanted
    );

    if (ballIndex !== -1) {
      const ballToSend = recipient.stack.splice(ballIndex, 1)[0];
      
      const sendMessage: Message = {
        type: 'SEND',
        from: recipient.id,
        to: sender.id,
        color: ballToSend,
        timestamp: Date.now()
      };

      messageQueue.push(sendMessage);
      console.log(`✅ Process ${recipient.id} sending ${ballToSend} to Process ${sender.id}`);
      
      // Check if recipient became monochrome after giving away a ball
      onMonochromeCheck(recipient);
    } else {
      console.log(`❌ Process ${recipient.id} cannot provide ${requestedColor} (doesn't have unwanted ${requestedColor})`);
    }

    // Continue the protocol only if not done
    if (!recipient.isDone) {
      onComputeWantedColor(recipient);
      onChoosePartner(recipient);
      if (recipient.partner) {
        this.sendRequest(recipient, messageQueue);
      }
    }
  }

  /**
   * Handle SEND message: receive a ball
   */
  handleSend(
    message: Message, 
    recipient: ProcessState, 
    sender: ProcessState,
    totalExchanges: { count: number },
    onMonochromeCheck: (process: ProcessState) => void,
    onComputeWantedColor: (process: ProcessState) => void,
    onChoosePartner: (process: ProcessState) => void,
    messageQueue: Message[]
  ): void {
    if (!message.color) return;

    // CRITICAL: Always accept balls, even if recipient is done, to preserve total count
    recipient.stack.push(message.color);
    totalExchanges.count++;

    console.log(`Process ${recipient.id} received ${message.color} from Process ${sender.id} (now has ${recipient.stack.length} balls)`);

    onMonochromeCheck(recipient);

    if (!recipient.isDone) {
      onComputeWantedColor(recipient);
      onChoosePartner(recipient);
      if (recipient.partner) {
        this.sendRequest(recipient, messageQueue);
      }
    }
  }

  /**
   * Handle DONE message: mark sender as completed
   */
  handleDone(message: Message, allProcesses: ProcessState[]): void {
    const sender = allProcesses.find(p => p.id === message.from);
    if (sender) {
      sender.isDone = true;
    }
  }

  /**
   * Check if a process has achieved monochrome state or optimal state
   */
  checkMonochrome(process: ProcessState, allProcesses: ProcessState[], messageQueue: Message[], perfectMonochromeAchievable: boolean): void {
    // Empty processes are considered optimal (no work needed)
    if (process.stack.length === 0) {
      if (!process.isDone) {
        process.isDone = true;
        this.sendDoneMessages(process, allProcesses, messageQueue);
      }
      return;
    }

    const uniqueColors = new Set(process.stack);
    
    // Perfect monochrome state
    if (uniqueColors.size === 1) {
      if (!process.isDone) {
        process.isDone = true;
        this.sendDoneMessages(process, allProcesses, messageQueue);
      }
      return;
    }

    // Check for optimal state when perfect monochrome isn't achievable
    if (this.isProcessInOptimalState(process, allProcesses, perfectMonochromeAchievable)) {
      if (!process.isDone) {
        process.isDone = true;
        this.sendDoneMessages(process, allProcesses, messageQueue);
      }
    }
  }

  /**
   * Check if a process is in its optimal state given the color distribution constraints
   */
  private isProcessInOptimalState(process: ProcessState, allProcesses: ProcessState[], perfectMonochromeAchievable: boolean): boolean {
    if (process.stack.length === 0) return true;

    if (perfectMonochromeAchievable) {
      // If perfect monochrome is achievable, only accept perfect monochrome
      return new Set(process.stack).size === 1;
    }

    // If perfect monochrome is not achievable, check for optimal distribution
    // Calculate total color counts across all processes
    const totalColorCounts = new Map<Color, number>();
    for (const p of allProcesses) {
      for (const color of p.stack) {
        totalColorCounts.set(color, (totalColorCounts.get(color) || 0) + 1);
      }
    }

    // Calculate this process's color counts
    const processColorCounts = new Map<Color, number>();
    for (const color of process.stack) {
      processColorCounts.set(color, (processColorCounts.get(color) || 0) + 1);
    }

    // Find the dominant color in this process
    const dominantEntry = Array.from(processColorCounts.entries())
      .reduce((max, current) => current[1] > max[1] ? current : max);
    
    const dominantColor = dominantEntry[0];
    const dominantCount = dominantEntry[1];

    // For unequal distributions, a process is optimal if it has achieved 
    // good concentration of its dominant color (≥ 60% threshold for mixed scenarios)
    const dominantPercentage = dominantCount / process.stack.length;
    
    return dominantPercentage >= 0.60;
  }

  /**
   * Send DONE messages to other active processes
   */
  private sendDoneMessages(process: ProcessState, allProcesses: ProcessState[], messageQueue: Message[]): void {
    for (const otherProcess of allProcesses) {
      if (otherProcess.id !== process.id && !otherProcess.isDone) {
        const doneMessage: Message = {
          type: 'DONE',
          from: process.id,
          to: otherProcess.id,
          timestamp: Date.now()
        };
        messageQueue.push(doneMessage);
      }
    }
  }

  /**
   * Trigger new requests for active processes without pending messages
   */
  triggerNewRequests(
    allProcesses: ProcessState[], 
    messageQueue: Message[],
    onComputeWantedColor: (process: ProcessState) => void,
    onChoosePartner: (process: ProcessState) => void
  ): void {
    for (const process of allProcesses) {
      if (!process.isDone) {
        // Only trigger new requests if no pending messages from this process
        const hasPendingMessages = messageQueue.some(m => m.from === process.id && m.type === 'REQUEST');
        if (!hasPendingMessages) {
          onComputeWantedColor(process);
          onChoosePartner(process);
          if (process.partner) {
            this.sendRequest(process, messageQueue);
          }
        }
      }
    }
  }
}
