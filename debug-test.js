// Simple debug test to see what's happening
const { BaseConsensusService } = require('./dist/consensus/base-consensus.service');
const { ColorSelectionService } = require('./dist/consensus/services/color-selection.service');
const { PartnerSelectionService } = require('./dist/consensus/services/partner-selection.service');
const { MessageHandlingService } = require('./dist/consensus/services/message-handling.service');
const { LoggingSystemService } = require('./dist/consensus/services/logging-system.service');
const { SystemStateService } = require('./dist/consensus/services/system-state.service');

async function testDistribution() {
  console.log('Creating services...');
  
  const consensusService = new BaseConsensusService(
    new ColorSelectionService(),
    new PartnerSelectionService(),
    new MessageHandlingService(),
    new LoggingSystemService(),
    new SystemStateService()
  );

  const customDistributions = {
    1: ['R', 'R', 'R', 'G'],
    2: ['G'],
    3: ['R', 'G']
  };

  console.log('Resetting with custom distributions...');
  consensusService.reset(customDistributions);

  const initialState = consensusService.getSystemState();
  console.log('\n=== INITIAL STATE ===');
  for (const process of initialState.processes) {
    console.log(`Process ${process.id}: [${process.stack.join(',')}] wanted: ${process.wanted || 'none'}`);
  }

  console.log('\nStarting consensus...');
  await consensusService.startConsensus();

  const finalState = consensusService.getSystemState();
  console.log('\n=== FINAL STATE ===');
  for (const process of finalState.processes) {
    console.log(`Process ${process.id}: [${process.stack.join(',')}] wanted: ${process.wanted} isDone: ${process.isDone}`);
  }

  console.log('\nExpected: Process 0: [R,R,R,R], Process 1: [G], Process 2: [G,G]');
  console.log(`Actual:   Process 0: [${finalState.processes[0].stack.join(',')}], Process 1: [${finalState.processes[1].stack.join(',')}], Process 2: [${finalState.processes[2].stack.join(',')}]`);
}

testDistribution().catch(console.error);
