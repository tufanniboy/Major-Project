import { scenarios } from '../data/mock-events.js';

export const deviceScenarios = scenarios.filter(s => !['normal', 'mixed'].includes(s.id));

export function deviceScenarioEvent(scenario, index, sourceIp, httpPort) {
  const type = scenario.types[index];
  return {
    sourceIp, destinationIp: scenario.target, eventType: type, user: 'admin',
    origin: 'Portal simulation', truth: 'malicious', scenarioId: scenario.id,
    protocol: type === 'PORT_ATTEMPT' ? 'TCP' : 'HTTP',
    port: type === 'PORT_ATTEMPT' ? [21, 22, 25, 53, 80, 110, 139, 443, 445, 3389][index % 10] : httpPort,
    bytes: type === 'LARGE_TRANSFER' ? 18000000 : 1024
  };
}
