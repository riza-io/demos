import { SelfLearningAgent } from "./SelfLearningAgent";

const args = process.argv.slice(2);
const firstArg = args[0];

if (firstArg) {
  const agent = new SelfLearningAgent(); // todo: we should use a non-learning agent to maintain a static list of loaded tools
  agent.load(`./saved-agents/${firstArg}.json`).then(() => agent.loop());
} else {
  const agent = new SelfLearningAgent();
  agent.loop();
}
