import { Node } from '@fluencelabs/fluence-network-environment';

export type Env = 'dev' | 'testnet' | 'local' | 'stage' | 'krasnodar';

export interface Context {
	nodes: Node[];
	relay: Node;
	env: Env;
	ttl: number;
	seed: string;
	verbose: boolean;
}
