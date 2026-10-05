export const techniques = {
  T1110: { name: 'Brute Force', tactic: 'Credential Access', description: 'Repeated attempts to authenticate may indicate password guessing.', evidence: 'Five or more failed authentications against the same account in 60 seconds.' },
  T1078: { name: 'Valid Accounts', tactic: 'Initial Access', description: 'An existing account may be used after its credentials are compromised.', evidence: 'A successful login follows an authentication failure burst.' },
  T1046: { name: 'Network Service Discovery', tactic: 'Discovery', description: 'Access attempts to multiple service ports may indicate service enumeration.', evidence: 'At least six distinct destination ports within 60 seconds.' },
  T1098: { name: 'Account Manipulation', tactic: 'Persistence', description: 'Changes to an account can provide additional or persistent access.', evidence: 'An unapproved privilege change is recorded.' },
  T1005: { name: 'Data from Local System', tactic: 'Collection', description: 'Sensitive local files can be collected before possible data transfer.', evidence: 'Sensitive file access by an untrusted device.' },
  T1213: { name: 'Data from Information Repositories', tactic: 'Collection', description: 'An information repository can expose valuable organizational data.', evidence: 'Repeated denied requests to a sensitive internal API.' },
  T1041: { name: 'Exfiltration Over C2 Channel', tactic: 'Exfiltration', description: 'A command-and-control channel can carry collected data. This lab models only transfer volume; C2 is not established.', evidence: 'Large synthetic outbound transfer. Provisional mapping; verify channel context.' }
};
export const techniqueUrl = id => `https://attack.mitre.org/techniques/${id}/`;
