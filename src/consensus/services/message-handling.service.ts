import { Message, ProcessState, Color } from '../types';

/**
 * Service responsible for message handling and processing logic
 */
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
    console.log(`📨 Process ${recipient.id} received request for ${requestedColor} from Process ${sender.id}`);
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

    console.log(`📦 Process ${recipient.id} received ${message.color} from Process ${sender.id} (now has ${recipient.stack.length} balls)`);

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
      sender.isActive = false;
    }
  }

  /**
   * Check if a process has achieved monochrome state
   */
  checkMonochrome(process: ProcessState, allProcesses: ProcessState[], messageQueue: Message[]): void {
    if (process.stack.length === 0) return;

    const uniqueColors = new Set(process.stack);
    if (uniqueColors.size === 1) {
      process.isDone = true;
      process.isActive = false;

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
      if (!process.isDone && process.isActive) {
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
