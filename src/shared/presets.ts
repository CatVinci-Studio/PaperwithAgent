import type { AgentConfig } from './types'

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  defaultProfile: 'openai',
  maxTurns: 10,
  temperature: 0.3,
  showToolCalls: true,
  profiles: [
    {
      name: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    },
    {
      name: 'qwen',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus',
    },
    {
      name: 'deepseek',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    },
    {
      name: 'custom',
      baseUrl: '',
      model: '',
    },
  ],
}
