import Anthropic from '@anthropic-ai/sdk';
import { ocrSessionRepository } from '../repositories/ocrSession.repository';
import { tesseractOcrService } from './tesseractOcr.service';
import { imagePreprocessor } from './imagePreprocessor.service';
import { koreanMedParser } from './koreanMedParser.service';
import type { ImageType } from '../types';

interface ExtractedMed {
  name: string;
  ingredient: string | null;
  dose: string | null;
  days: number | null;
  type: 'prescription' | 'otc' | 'supplement';
  confidence: number;
}

interface RawKeyword {
  text: string;
  matchedMedIndex: number | null;
}

interface OcrParseResult {
  ocrSessionId: string;
  imageType: ImageType;
  confidenceScore: number;
  extractedMeds: ExtractedMed[];
  rawKeywords: RawKeyword[];
}

type EngineResult = {
  imageType: ImageType;
  confidenceScore: number;
  extractedMeds: ExtractedMed[];
  rawKeywords: RawKeyword[];
};

function shouldUseClaudeOcr(): boolean {
  if (process.env.USE_CLAUDE_OCR !== 'true') return false;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return !!apiKey && apiKey !== 'sk-ant-xxxxx' && apiKey.startsWith('sk-ant-');
}

/** 키워드 텍스트를 extractedMeds와 매칭하여 RawKeyword 배열 생성 */
function linkKeywordsToMeds(keywords: string[], extractedMeds: ExtractedMed[]): RawKeyword[] {
  return keywords.map(kw => {
    const kwNorm = kw.replace(/\s+/g, '');
    const matchedIndex = extractedMeds.findIndex(med => {
      const nameNorm = med.name.replace(/\s+/g, '');
      return kwNorm.includes(nameNorm) || nameNorm.includes(kwNorm);
    });
    return {
      text: kw,
      matchedMedIndex: matchedIndex >= 0 ? matchedIndex : null,
    };
  });
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

    try {
      const result = shouldUseClaudeOcr()
        ? await parseWithClaude(imageBuffer, mimeType)
        : await parseWithTesseract(imageBuffer);

      // Update session
      await ocrSessionRepository.updateStatus(session.id, 'completed', {
        parsedMedsCount: result.extractedMeds.length,
        confidenceScore: result.confidenceScore,
      });

      return {
        ocrSessionId: session.id,
        imageType: result.imageType,
        confidenceScore: result.confidenceScore,
        extractedMeds: result.extractedMeds,
        rawKeywords: result.rawKeywords,
      };
    } catch (err) {
      console.error('[OCR] Parse failed:', err);
      await ocrSessionRepository.updateStatus(session.id, 'rejected');
      throw err;
    }
  },
};

// --- Tesseract.js engine ---

async function parseWithTesseract(imageBuffer: Buffer): Promise<EngineResult> {
  console.log('[OCR] Using Tesseract.js engine');

  // Preprocess image for better OCR accuracy
  const preprocessed = await imagePreprocessor.preprocess(imageBuffer);

  // Run OCR
  const { text, confidence } = await tesseractOcrService.recognizeText(preprocessed);
  console.log(`[OCR] Tesseract confidence: ${(confidence * 100).toFixed(1)}%, text length: ${text.length}`);

  if (!text.trim()) {
    return { imageType: 'other', confidenceScore: 0, extractedMeds: [], rawKeywords: [] };
  }

  // Parse Korean med text
  const parsed = koreanMedParser.parse(text, confidence);

  const avgConfidence =
    parsed.medications.length > 0
      ? parsed.medications.reduce((sum, m) => sum + m.confidence, 0) / parsed.medications.length
      : 0;

  // Extract all keywords from raw text and link to matched meds
  const keywordTexts = koreanMedParser.extractKeywords(text);
  const rawKeywords = linkKeywordsToMeds(keywordTexts, parsed.medications);

  return {
    imageType: parsed.imageType,
    confidenceScore: avgConfidence,
    extractedMeds: parsed.medications,
    rawKeywords,
  };
}

// --- Claude Vision API engine ---

async function parseWithClaude(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<EngineResult> {
  console.log('[OCR] Using Claude Vision API engine');

  const apiKey = process.env.ANTHROPIC_API_KEY!;
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
이미지에서 약물 정보를 추출하고, 이미지에 보이는 모든 텍스트 키워드도 함께 추출해주세요.

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
  ],
  "all_text_keywords": ["키워드1", "키워드2", ...]
}

규칙:
- 약품명은 한국어 제품명 그대로 추출
- 주성분은 가능하면 영문 성분명으로 (예: amlodipine besylate)
- 용량은 이미지에 보이는 그대로
- type은: 처방전/약봉투의 약 → "prescription", 약국 직접구매 → "otc", 건강기능식품 → "supplement"
- confidence: 약품명이 또렷하게 보이면 0.9+, 부분적으로 보이면 0.5~0.8, 추정이면 0.3~0.5
- 손글씨는 인식하지 마세요. 인쇄물만 추출합니다.
- 인식할 약물이 없으면 빈 배열을 반환하세요.
- all_text_keywords: 이미지에 보이는 모든 읽을 수 있는 텍스트를 개별 단어나 짧은 구절로 분리하여 배열로 반환
  - 약품명, 병원명, 약국명, 의사명, 주소, 날짜, 용법, 성분명 등 모든 텍스트 포함
  - 너무 짧은 텍스트(1글자)나 숫자만으로 된 텍스트는 제외
  - 중복 제거`,
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

  // Extract all_text_keywords from Claude response
  const allKeywords: string[] = Array.isArray(parsed.all_text_keywords)
    ? parsed.all_text_keywords.filter((k: unknown) => typeof k === 'string' && k.length >= 2)
    : [];

  // Ensure all medication names appear in keywords
  for (const med of extractedMeds) {
    if (!allKeywords.some(kw => kw.includes(med.name) || med.name.includes(kw))) {
      allKeywords.push(med.name);
    }
  }

  const rawKeywords = linkKeywordsToMeds(allKeywords, extractedMeds);

  return { imageType, confidenceScore: avgConfidence, extractedMeds, rawKeywords };
}
