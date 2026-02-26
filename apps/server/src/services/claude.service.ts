import Anthropic from '@anthropic-ai/sdk';

const DISCLAIMER = '이 정보는 참고용이며, 의학적 진단을 대체하지 않습니다.';

interface InteractionForSummary {
  type: string;
  severity: string;
  med_a: { name: string; ingredient: string };
  med_b?: { name: string; ingredient: string };
  reason: string;
  source: string;
}

interface SummaryResult {
  summary: string;
  actionGuide: string;
}

export const claudeService = {
  async generatePlainLanguageSummary(
    interactions: InteractionForSummary[],
    profileName: string,
    birthYear?: number | null,
  ): Promise<SummaryResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'sk-ant-xxxxx') {
      return this.fallbackSummary(interactions);
    }

    try {
      const client = new Anthropic({ apiKey });

      const interactionDescriptions = interactions
        .map((i, idx) => {
          const medB = i.med_b ? ` + ${i.med_b.name} (${i.med_b.ingredient})` : '';
          return `${idx + 1}. [${i.severity}] ${i.med_a.name} (${i.med_a.ingredient})${medB}\n   유형: ${i.type}\n   사유: ${i.reason}\n   출처: ${i.source}`;
        })
        .join('\n\n');

      const ageInfo = birthYear
        ? `\n대상자: ${profileName}, ${new Date().getFullYear() - birthYear}세`
        : `\n대상자: ${profileName}`;

      const prompt = `당신은 약물 안전 정보를 비전문가에게 쉽게 설명하는 약사입니다.
아래 약물 충돌 분석 결과를 읽고, 두 가지를 작성해주세요:
${ageInfo}

분석 결과:
${interactionDescriptions}

1. **summary**: 발견된 충돌을 일상 언어로 2~3문장으로 요약. 전문 용어를 쓸 때는 쉬운 말을 먼저 쓰고 괄호에 전문 용어를 씁니다.
2. **action_guide**: "의사/약사에게 이렇게 말씀하세요" 형태의 구체적인 행동 가이드 1~3문장.

중요한 규칙:
- "복용을 중단하세요"라고 절대 말하지 마세요. 대신 "의사/약사에게 확인하세요"로 안내하세요.
- 확실하지 않으면 "확인이 필요합니다"로 표현하세요.
- ${DISCLAIMER}

JSON 형식으로만 응답하세요:
{"summary": "...", "action_guide": "..."}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';
      const parsed = JSON.parse(text);
      return {
        summary: parsed.summary || '',
        actionGuide: parsed.action_guide || '',
      };
    } catch (err) {
      console.error('[Claude] API call failed, using fallback:', err);
      return this.fallbackSummary(interactions);
    }
  },

  fallbackSummary(interactions: InteractionForSummary[]): SummaryResult {
    if (interactions.length === 0) {
      return {
        summary: '현재 복용 중인 약물 간 충돌이 발견되지 않았습니다.',
        actionGuide: '정기 진료 시 복용 중인 모든 약물을 의사에게 알려주세요.',
      };
    }

    const hasContraindicated = interactions.some((i) => i.severity === 'contraindicated');
    const summaryParts = interactions.map((i) => {
      const medB = i.med_b ? `과(와) ${i.med_b.name}` : '';
      return `${i.med_a.name}${medB}: ${i.reason}`;
    });

    const summary = hasContraindicated
      ? `주의가 필요한 약물 조합이 발견되었습니다. ${summaryParts.join('. ')}.`
      : `확인이 필요한 약물 조합이 있습니다. ${summaryParts.join('. ')}.`;

    const actionGuide = hasContraindicated
      ? '다음 진료 시 의사에게 현재 복용 중인 모든 약물 목록을 보여주시고, 함께 복용해도 되는지 확인해주세요.'
      : '다음 진료 시 의사에게 현재 복용 중인 약물을 알려주세요.';

    return { summary, actionGuide };
  },
};
