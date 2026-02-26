import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface SeedMed {
  item_name: string;
  ingredient_eng: string;
  ingredient_kor: string;
  category: string;
  atc_code: string;
  med_type: 'prescription' | 'otc' | 'supplement';
  common_dose: string;
  etc_otc: string;
}

async function main() {
  console.log('[Seed] Starting...');

  // Clean existing data
  await prisma.interactionLog.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.ocrSession.deleteMany();
  await prisma.profile.deleteMany();
  console.log('[Seed] Cleared existing data');

  // Create test profiles
  const father = await prisma.profile.create({
    data: {
      name: '아버지',
      birthYear: 1957,
      notes: '고혈압, 당뇨, 전립선비대증 — 내과·비뇨기과 처방',
    },
  });

  const mother = await prisma.profile.create({
    data: {
      name: '어머니',
      birthYear: 1959,
      notes: '고혈압, 골다공증, 위장질환 — 내과·정형외과 처방',
    },
  });

  console.log(`[Seed] Created profiles: ${father.name} (${father.id}), ${mother.name} (${mother.id})`);

  // Load common medications
  const dataPath = path.resolve(__dirname, '../../../../files_real/common_medications.json');
  const meds: SeedMed[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Father's medications: hypertension + diabetes + BPH related
  const fatherMedNames = [
    '암로디핀베실산염정 5mg',
    '메트포르민염산염정 500mg',
    '아토르바스타틴칼슘정 10mg',
    '탐스로신염산염캡슐 0.2mg',
    '오메프라졸캡슐 20mg',
    '아스피린장용정 100mg',
    '은행잎추출물건강기능식품',
  ];

  // Mother's medications: hypertension + osteoporosis + gastritis related
  const motherMedNames = [
    '리시노프릴정 10mg',
    '알렌드로네이트나트륨정 70mg',
    '레보티록신나트륨정 0.1mg',
    '클로피도그렐정 75mg',
    '칼슘마그네슘비타민D정',
    '오메가3건강기능식품',
  ];

  for (const medName of fatherMedNames) {
    const med = meds.find((m) => m.item_name === medName);
    if (!med) {
      console.warn(`[Seed] Medication not found: ${medName}`);
      continue;
    }
    await prisma.medication.create({
      data: {
        profileId: father.id,
        name: med.item_name,
        ingredient: med.ingredient_eng,
        dose: med.common_dose,
        days: 30,
        type: med.med_type,
        source: 'manual',
        status: 'active',
      },
    });
  }
  console.log(`[Seed] Added ${fatherMedNames.length} medications for ${father.name}`);

  for (const medName of motherMedNames) {
    const med = meds.find((m) => m.item_name === medName);
    if (!med) {
      console.warn(`[Seed] Medication not found: ${medName}`);
      continue;
    }
    await prisma.medication.create({
      data: {
        profileId: mother.id,
        name: med.item_name,
        ingredient: med.ingredient_eng,
        dose: med.common_dose,
        days: 30,
        type: med.med_type,
        source: 'manual',
        status: 'active',
      },
    });
  }
  console.log(`[Seed] Added ${motherMedNames.length} medications for ${mother.name}`);

  console.log('[Seed] Done!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
