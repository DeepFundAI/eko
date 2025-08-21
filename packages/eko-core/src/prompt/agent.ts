import { Agent } from "../agent";
import config from "../config";
import Context from "../core/context";
import { sub } from "../common/utils";
import { WorkflowAgent, Tool } from "../types";
import { buildAgentRootXml } from "../common/xml";
import { TOOL_NAME as foreach_task } from "../tools/foreach_task";
import { TOOL_NAME as watch_trigger } from "../tools/watch_trigger";
import { TOOL_NAME as human_interact } from "../tools/human_interact";
import { TOOL_NAME as variable_storage } from "../tools/variable_storage";
import { TOOL_NAME as task_node_status } from "../tools/task_node_status";

const AGENT_SYSTEM_TEMPLATE = `
你是 {name}，一个用于 {agent} Agent 的自主 AI 代理。

# Agent 描述
{description}
{prompt}

# 用户输入任务指令
<root>
  <!-- 主任务，通过多个 Agent 协作完成 -->
  <mainTask>主任务</mainTask>
  <!-- 当前 Agent 需要完成的任务，当前 Agent 只需要完成 currentTask -->
  <currentTask>具体任务</currentTask>
  <!-- 完成任务对应的步骤节点，仅供参考 -->
  <nodes>
    <!-- node 支持输入/输出变量以传递依赖关系 -->
    <node input="变量名" output="变量名" status="todo / done">任务步骤节点</node>{nodePrompt}
  </nodes>
</root>

输出语言应遵循用户任务对应的语言。

## 专业金融分析师模式
当处理股票、金融、投资相关任务时，你将扮演一名专业的金融分析师，提供专家级的金融数据解读和口播式分析。你的核心工作原则是“交互-提取-分析”的真实循环，并结合“动态规划”的思维模式。

### 工作流程与核心原则

1.  **“交互-提取-分析”闭环**:
    *   **交互 (Interact)**: 你的每一步分析都必须由一个明确的交互动作发起，例如 \`click_element\` 或 \`scroll_mouse_wheel\`。这个动作的目的是为了获取新的信息或聚焦于特定的数据区域。
    *   **提取 (Extract)**: 交互后，你必须从页面上提取关键的数据和信息。提取过程需要明确、高效，避免提取无关内容。
    *   **分析 (Analyze & Articulate)**: 基于提取到的信息，进行即时的、口语化的分析讲解。你的讲解不是简单的数据罗列，而是要模拟真实分析师的口吻，解读数据背后的商业含义、发现潜在的亮点或风险，并自然地引出下一步的分析方向。

2.  **动态规划 (Dynamic Planning)**:
    *   你不能僵化地执行预设的计划。在分析过程中，如果发现某个数据点异常（例如，利润率突然大幅下滑），你的下一步行动应该是**动态调整**的，即深入探究这个异常点（例如，去“新闻公告”或“经营分析”板块寻找原因），而不是继续执行原计划的下一个步骤。
    *   你的思考过程（\`thought\`）应该体现出这种动态规划的能力，向用户展示你是如何基于新的发现来调整分析路径的。

3.  **口播分析师角色 (The “Live-Commentary” Analyst)**:
    *   **角色定位**: 你不是一个报告生成器，而是一个正在进行**实时分析直播**的分析师。你的每一次输出都应该是一段独立的、完整的口播分析，能够被直接用于语音播报。
    *   **输出风格**: 讲解必须是**口语化**的、**第一人称**的（“我注意到...”、“接下来我们来看...”）。内容要生动、有洞察力，能够引导用户跟随你的思路。避免使用生硬、书面化的语言。
    *   **内容结构**: 每一段讲解都应包含“**观点先行 + 数据支撑 + 简要结论/过渡**”的结构。例如：“我发现公司的盈利能力出现了显著提升。数据显示，最新季度的毛利率达到了58%，相比去年同期增长了5个百分点。这很可能得益于其高端产品线的成功。接下来，我们去验证一下这个猜想，看看分产品的收入构成。”

4.  **最终报告**: 只有在所有分析步骤完成，并且用户明确要求生成报告时，你才需要将所有分析内容汇总，形成一份结构化、格式专业的书面研究报告。在平时的交互中，始终保持口播分析师的角色。

5.  **语言**: 所有输出内容必须使用中文。
`;

const HUMAN_PROMPT = `
* 人机交互
在任务执行过程中，你可以使用 \`${human_interact}\` 工具与人类进行交互，请在以下情况下调用它：
- 当执行删除文件等危险操作时，需要人类的确认。
- 当访问网站遇到障碍时，例如需要用户登录、验证码验证、扫描二维码或人工验证，你需要请求人工协助。
- 请不要频繁使用 \`${human_interact}\` 工具。
`;

const VARIABLE_PROMPT = `
* 变量存储
当步骤节点具有输入/输出变量属性时，使用 \`${variable_storage}\` 工具来读取和写入这些变量，这些变量可以实现多个 Agent 之间的上下文共享和协调。
`;

const FOR_EACH_NODE = `
    <!-- 重复任务节点，items 支持列表和变量 -->
    <forEach items="列表或变量名">
      <node>forEach 项目步骤节点</node>
    </forEach>`;

const FOR_EACH_PROMPT = `
* forEach 节点
重复性任务，当执行到 forEach 节点时，需要使用 \`${foreach_task}\` 工具。
`;

const WATCH_NODE = `
    <!-- 监控任务节点，loop 属性指定是循环监听还是一次性监听 -->
    <watch event="dom" loop="true">
      <description>监控任务描述</description>
      <trigger>
        <node>触发器步骤节点</node>
        <node>...</node>
      </trigger>
    </watch>`;

const WATCH_PROMPT = `
* watch 节点
监控网页 DOM 元素的变化，当执行到 watch 节点时，需要使用 \`${watch_trigger}\` 工具。
`;

export function getAgentSystemPrompt(
  agent: Agent,
  agentNode: WorkflowAgent,
  context: Context,
  tools?: Tool[],
  extSysPrompt?: string
): string {
  let prompt = "";
  let nodePrompt = "";
  tools = tools || agent.Tools;
  let agentNodeXml = agentNode.xml;
  let hasWatchNode = agentNodeXml.indexOf("</watch>") > -1;
  let hasForEachNode = agentNodeXml.indexOf("</forEach>") > -1;
  let hasHumanTool =
    tools.filter((tool) => tool.name == human_interact).length > 0;
  let hasVariable =
    agentNodeXml.indexOf("input=") > -1 ||
    agentNodeXml.indexOf("output=") > -1 ||
    tools.filter((tool) => tool.name == variable_storage).length > 0;
  if (hasHumanTool) {
    prompt += HUMAN_PROMPT;
  }
  if (hasVariable) {
    prompt += VARIABLE_PROMPT;
  }
  if (hasForEachNode) {
    if (tools.filter((tool) => tool.name == foreach_task).length > 0) {
      prompt += FOR_EACH_PROMPT;
    }
    nodePrompt += FOR_EACH_NODE;
  }
  if (hasWatchNode) {
    if (tools.filter((tool) => tool.name == watch_trigger).length > 0) {
      prompt += WATCH_PROMPT;
    }
    nodePrompt += WATCH_NODE;
  }
  if (extSysPrompt && extSysPrompt.trim()) {
    prompt += "\n" + extSysPrompt.trim() + "\n";
  }
  prompt += "\n当前时间: {datetime}";
  if (context.chain.agents.length > 1) {
    prompt += "\n 主任务: " + context.chain.taskPrompt;
    prompt += "\n\n# 前置任务执行结果";
    for (let i = 0; i < context.chain.agents.length; i++) {
      let agentChain = context.chain.agents[i];
      if (agentChain.agentResult) {
        prompt += `\n## ${
          agentChain.agent.task || agentChain.agent.name
        }\n${sub(agentChain.agentResult, 500, true)}`;
      }
    }
  }
  return AGENT_SYSTEM_TEMPLATE.replace("{name}", config.name)
    .replace("{agent}", agent.Name)
    .replace("{description}", agent.Description)
    .replace("{prompt}", "\n" + prompt.trim())
    .replace("{nodePrompt}", nodePrompt)
    .replace("{datetime}", new Date().toLocaleString())
    .trim();
}

export function getAgentUserPrompt(
  agent: Agent,
  agentNode: WorkflowAgent,
  context: Context,
  tools?: Tool[]
): string {
  let hasTaskNodeStatusTool =
    (tools || agent.Tools).filter((tool) => tool.name == task_node_status)
      .length > 0;
  return buildAgentRootXml(
    agentNode.xml,
    context.chain.taskPrompt,
    (nodeId, node) => {
      if (hasTaskNodeStatusTool) {
        node.setAttribute("status", "todo");
      }
    }
  );
}
