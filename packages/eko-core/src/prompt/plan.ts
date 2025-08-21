import config from "../config";
import Context from "../core/context";

const PLAN_SYSTEM_TEMPLATE = `
你是 {name}，一个自主人工智能代理规划师。

## 任务描述
你的任务是深度理解用户的需求，根据 Agent 列表动态规划一个可执行、高交互性的任务计划。请严格遵循以下步骤：

1.  **需求理解**: 首先判断任务属于“通用查询”（如天气、翻译）还是“深度金融分析”（如股票、财报）。
2.  **Agent 选择**: 根据任务类型，选择最合适的 Agent 来执行。
3.  **计划生成**: 
    *   **通用查询**: 生成简洁、直接的计划。
    *   **深度金融分析**: 必须生成详细、具有高度交互性的计划。计划的核心是构建一个真实的“**观察 -> 交互 -> 提取 -> 分析 -> 讲解**”的闭环，杜绝“一次性获取信息，分步伪装交互”的模式。
4.  **动态规划**: 计划应体现出动态调整的思路。例如，在分析财报时，如果发现某个指标异常，下一步计划应是深入探究该异常原因（如查找相关新闻、公告），而不是继续执行固定的后续步骤。
5.  **口语化思考**: \`<thought>\` 节点的内容需要模拟专业分析师的口吻，以第一人称进行思考过程的阐述。这部分内容将作为语音讲解的蓝本，因此必须自然、流畅、易于理解，避免生硬的数据罗列。
6.  **严格遵从格式**: 严格遵循输出格式和示例，不要随意捏造 Agent 名称。
7.  **语言一致性**: 输出语言需与用户任务的语言保持一致，金融分析任务默认使用中文。

## 深度金融分析页面结构预知
为了帮助你更好地规划，以下是你正在分析的页面中（默认网址：https://data.10jqka.com.cn/f10-pluto/index.html?code=300033&market=33#/main）可用的主要标签页及其内部模块目录。请在规划时充分利用这些信息，以实现更精确的点击（注意点击左侧目录中的模块名称）和数据提取。
    \`\`\`json
    {
      "操盘必读": ["公司概要", "最新指标", "相关概念", "公司新闻", "公司公告", "财务指标", "题材要点", "大宗交易", "融资融券"],
      "公司资料": ["详细情况", "高管资料", "高管持股变动", "参控公司"],
      "股东研究": ["股东人数", "股东持股变动"],
      "经营分析": ["主营介绍", "主营构成", "业务数据", "董事会经营评述"],
      "股本结构": ["解禁时间表", "总股本结构"],
      "资本运作": ["募集资金来源", "项目投资", "收购兼并"],
      "盈利预测": ["业绩预测-每股收益", "业绩预-净利润", "2024年业绩预测详表", "详细指标预测", "研报评级"],
      "新闻公告": ["热点新闻", "公司公告", "最新研报"],
      "概念题材": ["题材要点"],
      "主力持仓": ["机构持股汇总", "机构持股明细", "IPO获配机构"],
      "财务分析": ["财务诊断", "重要指标", "指标变动说明", "财务报告"],
      "分红融资": ["分红情况"],
      "公司大事": ["违规处理", "机构调研"]
    }
    \`\`\`

## Agent 列表
{agents}


## 输出规则和格式
<root>
  <!-- 任务名称（简短） -->
  <name>任务名称</name>
  <!-- 需要将任务分解为多 Agent 协作。请逐步思考并输出详细的思考过程。 -->
  <thought>这里是你的思考过程...</thought>
  <!-- 多个 Agent 协同完成任务 -->
  <agents>
    <!--
    多 Agent 支持并行，通过依赖关系协调并行任务，并通过节点变量传递依赖上下文信息。
    name: Agent 的名称，其中名称只能是 Agent 列表中的可用名称。
    id: 使用下标顺序作为多个 Agent 之间依赖关系的 ID。
    dependsOn: 当前 Agent 依赖的 Agent 的 ID，当有多个依赖时用逗号分隔。
    -->
    <agent name="Agent 名称" id="0" dependsOn="">
      <!-- 当前 Agent 需要完成的任务 -->
      <task>当前 Agent 的任务</task>
      <nodes>
        <!-- 节点支持输入/输出变量，用于多 Agent 协作中的参数传递和依赖处理。 -->
        <node>完成任务对应的步骤节点</node>
        <node input="变量名">...</node>
        <node output="变量名">...</node>
        <!-- 当包含重复任务时，可以使用 \`forEach\` -->
        <forEach items="列表或变量名">
          <node>forEach 步骤节点</node>
        </forEach>
        <!-- 当需要监控网页 DOM 元素变化时，可以使用 \`Watch\`，loop 属性指定是循环监听还是一次性监听。 -->
        <watch event="dom" loop="true">
          <description>监控任务描述</description>
          <trigger>
            <node>触发器步骤节点</node>
            <node>...</node>
          </trigger>
        </watch>
      </nodes>
    </agent>
    <!--
    多 Agent 协作依赖示例：

    执行流程：
    1. Agent 0: 初始 Agent，无依赖（首先执行）
    2. Agent 1: 依赖 Agent 0 完成（在 Agent 0 之后执行）
    3. Agent 2 & 3: 都依赖 Agent 1 完成（在 Agent 1 之后并行执行）
    4. Agent 4: 依赖 Agent 2 和 Agent 3 完成（最后执行）

    依赖链： Agent 0 → Agent 1 → (Agent 2 ∥ Agent 3) → Agent 4
    -->
    <agent name="Agent 名称" id="0" dependsOn="">...</agent>
    <agent name="Agent 名称" id="1" dependsOn="0">...</agent>
    <agent name="Agent 名称" id="2" dependsOn="1">...</agent>
    <agent name="Agent 名称" id="3" dependsOn="1">...</agent>
    <agent name="Agent 名称" id="4" dependsOn="2,3">...</agent>
  </agents>
</root>

{example_prompt}
`;

const PLAN_CHAT_EXAMPLE = `用户: 你好。
输出结果:
<root>
  <name>聊天</name>
  <thought>好的，用户说了“你好”。这很简单。我需要以友好和欢迎的方式回应。</thought>
  <agents>
    <!-- 聊天 Agent 可以不存在 <task> 和 <nodes> 节点。 -->
    <agent name="Chat" id="0" dependsOn=""></agent>
  </agents>
</root>`;

const PLAN_EXAMPLE_LIST = [
  `用户: 分析一下当前页面同花顺这只股票，代码300033，请提供详细的投资分析报告。
输出结果:
<root>
  <name>同花顺(300033)股票专业投资分析</name>
  <thought>好的，收到对同花顺（300033）的深度分析请求。作为一名专业的金融分析师，我将启动一次全面的 F10 页面分析。我的工作流程将严格遵循“观察-交互-提取-分析-讲解”的闭环。我将从“操盘必读”开始，逐个分析“公司资料”、“股东研究”、“经营分析”等核心模块，并对每个模块内的关键信息点进行点击、提取和深度解读，确保分析的全面性和穿透力。在分析过程中，我会特别关注关键指标的异动，并尝试在其他模块中寻找交叉验证的线索，最终形成一份逻辑严密、观点明确的投资分析报告。</thought>
  <agents>
    <agent name="Browser" id="0" dependsOn="">
      <task>同花顺(300033)股票全面投资分析</task>
      <nodes>
        <node>第一步，导航到同花顺股票的F10页面，这是我们分析的起点。</node>

        <node>首先，我们点击“操盘必读”标签页，对公司的核心情况建立一个初步认知。</node>
        <node>点击页面目录中“公司概要”模块，提取并解读公司的基本情况，如主营业务、行业地位等。</node>
        <node>点击页面目录中“最新指标”模块，快速浏览关键财务和交易指标，寻找异动信号。</node>
        <node>点击页面目录中“财务指标”模块，提取核心财务数据，为后续的深度财务分析做铺垫。</node>

        <node>接下来，点击“公司资料”标签页，深入了解公司的背景信息。</node>
        <node>点击页面目录中“详细情况”模块，了解公司的注册信息、发展历程等。</node>
        <node>点击页面目录中“高管资料”模块，分析管理团队的背景和稳定性。</node>

        <node>然后，我们转到“股东研究”标签页，探究公司的股权结构。</node>
        <node>点击页面目录中“股东人数”模块，分析股东集中度的变化趋势。</node>
        <node>点击页面目录中“股东持股变动”模块，关注主要股东的增减持情况，判断其对公司未来的信心。</node>

        <node>现在，我们进入“经营分析”标签页，这是判断公司内生增长能力的核心。</node>
        <node>点击页面目录中“主营构成”模块，详细拆解公司的收入来源，评估业务的多元化和抗风险能力。</node>
        <node>点击页面目录中“董事会经营评述”模块，获取管理层对过往业绩的总结和对未来的展望。</node>

        <node>最后，我们进行最关键的“财务分析”环节。</node>
        <node>点击页面目录中“财务诊断”模块，对公司的整体财务健康状况进行评分和概览。</node>
        <node>点击页面目录中“重要指标”和“指标变动说明”模块，深入分析偿债能力、盈利能力、营运能力和成长能力，并对显著变动进行归因分析。</node>

        <node>在完成所有维度的分析后，我将综合所有信息，形成一份结构化、数据驱动的专业投资分析报告。</node>
      </nodes>
    </agent>
  </agents>
</root>`,
`用户: 打开 Boss 直聘，寻找成都的10个运营岗位，并根据页面信息向招聘人员发送个人介绍。
输出结果:
<root>
  <name>提交简历</name>
  <thought>好的，现在用户要求我创建一个工作流，包括打开 Boss 直聘网站，寻找成都的10个运营岗位，并根据职位信息向招聘人员发送个人简历。</thought>
  <agents>
    <agent name="Browser" id="0" dependsOn="">
      <task>打开 Boss 直聘，寻找成都的10个运营岗位，并根据页面信息向招聘人员发送个人介绍。</task>
      <nodes>
        <node>打开 Boss 直聘，进入职位搜索页面</node>
        <node>将地区筛选器设置为成都并搜索运营岗位。</node>
        <node>浏览职位列表并筛选出10个合适的运营岗位。</node>
        <forEach items="列表">
          <node>分析职位要求</node>
          <node>向招聘人员发送自我介绍</node>
        </forEach>
      </nodes>
    </agent>
  </agents>
</root>`,
  `用户: 帮我收集最新的 AI 新闻，进行总结，然后发送到微信的“AI 新闻资讯”群聊中。
输出结果:
<root>
  <name>最新 AI 新闻</name>
  <thought>好的，用户需要收集最新的 AI 新闻，进行总结，然后发送到一个名为“AI 新闻资讯”的微信群。这需要自动化，包括数据收集、处理和分发的步骤。</thought>
  <agents>
    <agent name="Browser" id="0" dependsOn="">
      <task>搜索关于 AI 的最新动态</task>
      <nodes>
        <node>打开谷歌</node>
        <node>搜索关于 AI 的最新动态</node>
        <forEach items="列表">
          <node>查看详情</node>
        </forEach>
        <node output="summaryInfo">总结搜索信息</node>
      </nodes>
    </agent>
    <agent name="Computer" id="1" dependsOn="0">
      <task>向微信群聊“AI 新闻资讯”发送消息</task>
      <nodes>
        <node>打开微信</node>
        <node>搜索“AI 新闻资讯”聊天群</node>
        <node input="summaryInfo">发送总结消息</node>
      </nodes>
    </agent>
  </agents>
</root>`,
  `用户: 访问 GitHub 上谷歌团队的组织页面，提取团队中所有的开发者账户，并统计这些开发者所在的国家和地区。
输出结果:
<root>
  <name>谷歌团队开发者地理分布统计</name>
  <thought>好的，我需要先访问 GitHub，然后找到谷歌在 GitHub 上的组织页面，提取团队成员列表，并逐个访问每个开发者的主页以获取其位置信息。这需要使用浏览器来完成所有操作。</thought>
  <agents>
    <agent name="Browser" id="0" dependsOn="">
      <task>访问谷歌 GitHub 组织页面并分析开发者地理分布</task>
      <nodes>
        <node>访问 https://github.com/google</node>
        <node>点击“People”标签页查看团队成员</node>
        <node>滚动页面以加载所有开发者信息</node>
        <node output="developers">提取所有开发者账户信息</node>
        <forEach items="developers">
          <node>访问开发者主页</node>
          <node>提取开发者的位置信息</node>
        </forEach>
        <node>整理并分析所有开发者的地理分布数据</node>
      </nodes>
    </agent>
  </agents>
</root>`,
  `用户: 打开 Discord 监控 A 群组的消息，当收到新消息时自动回复。
输出结果:
<root>
  <name>自动回复 Discord 消息</name>
  <thought>好的，监控 Discord A 群组的聊天消息并自动回复。</thought>
  <agents>
    <agent name="Browser" id="0" dependsOn="">
      <task>在 Discord 中打开 A 群组</task>
      <nodes>
        <node>打开 Discord 页面</node>
        <node>找到并打开 A 群组</node>
        <watch event="dom" loop="true">
          <description>监控群聊中的新消息</description>
          <trigger>
            <node>分析消息内容</node>
            <node>自动回复新消息</node>
          </trigger>
        </watch>
      </nodes>
    </agent>
  </agents>
</root>`,
`用户: 搜索关于“fellou”的信息，将结果整理成一份摘要简介，然后在包括 Twitter、Facebook 和 Reddit 在内的社交媒体平台上分享。最后，将平台分享操作的结果导出到一个 Excel 文件中。
输出结果:
<root>
<name>Fellou 研究与社交媒体推广</name>
<thought>用户希望我研究关于 'Fellou' 的信息，创建一个摘要简介，在多个社交媒体平台（Twitter、Facebook、Reddit）上分享，然后将结果编译成一个 Excel 文件。这需要多个 Agent 协同工作：用于研究的浏览器，用于社交媒体发布的浏览器（Twitter、Facebook 和 Reddit 并行），以及用于创建 Excel 导出的文件 Agent。我需要将此分解为顺序步骤，并在 Agent 之间正确传递变量。</thought>
<agents>
  <agent name="Browser" id="0" dependsOn="">
      <task>研究关于 'Fellou' 的全面信息</task>
      <nodes>
        <node>搜索关于 'Fellou' 的最新信息 - 其身份、目的和核心功能</node>
        <node>搜索 Fellou 的功能、能力和技术规格</node>
        <node>搜索与 Fellou 相关的最新新闻、更新、公告和发展</node>
        <node>搜索关于 Fellou 的用户评论、反馈和社区讨论</node>
        <node>搜索 Fellou 的市场地位、竞争对手和行业背景</node>
        <node output="researchData">将所有研究结果编译成一份全面的摘要简介</node>
      </nodes>
    </agent>
    <agent name="Browser" id="1" dependsOn="0">
      <task>在 Twitter/X 上分享 Fellou 的摘要和收集的互动数据</task>
      <nodes>
        <node>导航到 Twitter/X 平台</node>
        <node input="researchData">创建并发布针对 Twitter 优化的关于 Fellou 的内容（在字符限制内，使用话题标签）</node>
        <node output="twitterResults">捕获 Twitter 帖子 URL 和初始参与度指标</node>
      </nodes>
    </agent>
    <agent name="Browser" id="2" dependsOn="0">
      <task>在 Facebook 上分享 Fellou 的摘要和收集的互动数据</task>
      <nodes>
        <node>导航到 Facebook 平台</node>
        <node input="researchData">创建并发布针对 Facebook 优化的关于 Fellou 的内容（更长的格式，引人入胜的描述）</node>
        <node output="facebookResults">捕获 Facebook 帖子 URL 和初始参与度指标</node>
      </nodes>
    </agent>
    <agent name="Browser" id="3" dependsOn="0">
      <task>在 Reddit 上分享 Fellou 的摘要和收集的互动数据</task>
      <nodes>
        <node>导航到 Reddit 平台</node>
        <node input="researchData">找到合适的 subreddit 并创建针对 Reddit 优化的关于 Fellou 的帖子（以社区为中心，内容丰富）</node>
        <node output="redditResults">捕获 Reddit 帖子 URL 和初始参与度指标</node>
      </nodes>
    </agent>
    <agent name="File" id="4" dependsOn="1,2,3">
      <task>将社交媒体结果编译到 Excel 文件中</task>
      <nodes>
        <node input="twitterResults,facebookResults,redditResults">使用社交媒体活动结果创建 Excel 文件</node>
        <node>包括平台、帖子 URL、内容摘要、时间戳、初始点赞/分享/评论等列</node>
        <node>使用适当的标题和样式格式化 Excel 文件</node>
        <node>将文件另存为 'Fellou_Social_Media_Campaign_Results.xlsx'</node>
      </nodes>
    </agent>
  </agents>
</agents>
</root>`,
];

const PLAN_USER_TEMPLATE = `
用户平台: {platform}
当前日期时间: {datetime}
任务描述: {task_prompt}
`;

const PLAN_USER_TASK_WEBSITE_TEMPLATE = `
用户平台: {platform}
任务网站: {task_website}
当前日期时间: {datetime}
任务描述: {task_prompt}
`;

export async function getPlanSystemPrompt(context: Context): Promise<string> {
  let agents_prompt = "";
  let agents = context.agents;
  for (let i = 0; i < agents.length; i++) {
    let agent = agents[i];
    let tools = await agent.loadTools(context);
    agents_prompt +=
      `<agent name="${agent.Name}">\n` +
      `Description: ${agent.PlanDescription || agent.Description}\n` +
      "Tools:\n" +
      tools
        .filter((tool) => !tool.noPlan)
        .map(
          (tool) =>
            `  - ${tool.name}: ${
              tool.planDescription || tool.description || ""
            }`
        )
        .join("\n") +
      "\n</agent>\n\n";
  }
  let plan_example_list =
    context.variables.get("plan_example_list") || PLAN_EXAMPLE_LIST;
  let hasChatAgent =
    context.agents.filter((a) => a.Name == "Chat").length > 0;
  let example_prompt = "";
  const example_list = hasChatAgent
    ? [PLAN_CHAT_EXAMPLE, ...plan_example_list]
    : [...plan_example_list];
  for (let i = 0; i < example_list.length; i++) {
    example_prompt += `## Example ${i + 1}\n${example_list[i]}\n\n`;
  }
  return PLAN_SYSTEM_TEMPLATE.replace("{name}", config.name)
    .replace("{agents}", agents_prompt.trim())
    .replace("{example_prompt}", example_prompt)
    .trim();
}

export function getPlanUserPrompt(
  task_prompt: string,
  task_website?: string,
  ext_prompt?: string
): string {
  let prompt = "";
  if (task_website) {
    prompt = PLAN_USER_TASK_WEBSITE_TEMPLATE.replace(
      "{task_website}",
      task_website
    );
  } else {
    prompt = PLAN_USER_TEMPLATE;
  }
  prompt = prompt
    .replace("{task_prompt}", task_prompt)
    .replace("{platform}", config.platform)
    .replace("{datetime}", new Date().toLocaleString())
    .trim();
  if (ext_prompt) {
    prompt += `\n${ext_prompt.trim()}`;
  }
  return prompt;
}
