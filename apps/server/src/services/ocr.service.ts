import Anthropic from '@anthropic-ai/sdk';
import { ocrSessionRepository } from '../repositories/ocrSession.repository';
import type { ImageType } from '../types';

interface ExtractedMed {
  name: string;
  ingredient: string | null;
  dose: string | null;
  days: number | null;
  type: 'prescription' | 'otc' | 'supplement';
  confidence: number;
}

interface OcrParseResult {
  ocrSessionId: string;
  imageType: ImageType;
  confidenceScore: number;
  extractedMeds: ExtractedMed[];
}

export const ocrService = {
  async parseImage(
    profileId: string,
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<OcrParseResult> {
    // Create OCR session
    const session = await ocrSessionRepository.create({
      profileId,
      imageType: 'other',
      status: 'pending',
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'sk-ant-xxxxx') {
      throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
    }

    try {
      const client = new Anthropic({ apiKey });
      const base64Image = imageBuffer.toString('base64');

      const mediaType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `이 이미지는 약물 관련 사진(처방전, 약봉투, OTC 박스, 건강기능식품 라벨)입니다.
이미지에서 약물 정보를 추출해주세요.

다음 JSON 형식으로만 응답하세요:
{
  "image_type": "prescription" | "med_bag" | "otc_box" | "supplement_label" | "other",
  "medications": [
    {
      "name": "약품명 (한국어)",
      "ingredient": "주성분 영문명",
      "dose": "용량/용법 (예: 1일 1회 5mg)",
      "days": 투약일수(숫자) 또는 null,
      "type": "prescription" | "otc" | "supplement",
      "confidence": 0.0~1.0 (인식 신뢰도)
    }
  ]
}

규칙:
- 약품명은 한국어 제품명 그대로 추출
- 주성분은 가능하면 영문 성분명으로 (예: amlodipine besylate)
- 용량은 이미지에 보이는 그대로
- type은: 처방전/약봉투의 약 → "prescription", 약국 직접구매 → "otc", 건강기능식품 → "supplement"
- confidence: 약품명이 또렷하게 보이면 0.9+, 부분적으로 보이면 0.5~0.8, 추정이면 0.3~0.5
- 손글씨는 인식하지 마세요. 인쇄물만 추출합니다.
- 인식할 약물이 없으면 빈 배열을 반환하세요.`,
              },
            ],
          },
        ],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '{}';

      // Extract JSON from response (may include markdown code fences)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { image_type: 'other', medications: [] };

      const extractedMeds: ExtractedMed[] = (parsed.medications || []).map(
        (m: Record<string, unknown>) => ({
          name: String(m.name || ''),
          ingredient: m.ingredient ? String(m.ingredient) : null,
          dose: m.dose ? String(m.dose) : null,
          days: typeof m.days === 'number' ? m.days : null,
          type: (['prescription', 'otc', 'supplement'].includes(String(m.type))
            ? String(m.type)
            : 'prescription') as 'prescription' | 'otc' | 'supplement',
          confidence: typeof m.confidence === 'number' ? m.confidence : 0.5,
        }),
      );

      const avgConfidence =
        extractedMeds.length > 0
          ? extractedMeds.reduce((sum, m) => sum + m.confidence, 0) / extractedMeds.length
          : 0;

      const imageType = (['prescription', 'med_bag', 'otc_box', 'supplement_label'].includes(
        parsed.image_type,
      )
        ? parsed.image_type
        : 'other') as ImageType;

      // Update session
      await ocrSessionRepository.updateStatus(session.id, 'completed', {
        parsedMedsCount: extractedMeds.length,
        confidenceScore: avgConfidence,
      });

      return {
        ocrSessionId: session.id,
        imageType,
        confidenceScore: avgConfidence,
        extractedMeds,
      };
    } catch (err) {
      console.error('[OCR] Parse failed:', err);
      await ocrSessionRepository.updateStatus(session.id, 'rejected');
      throw err;
    }
  },
};
