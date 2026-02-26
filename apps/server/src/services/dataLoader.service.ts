import * as fs from 'fs';
import * as path from 'path';
import type {
  Ingredient,
  ContraindicationPair,
  SupplementDrugInteraction,
  DuplicateIngredientGroup,
  ElderlyCaution,
} from '../types';

const DATA_DIR = path.resolve(__dirname, '../../../../files_real');

class DataLoaderService {
  ingredientsByCode: Map<string, Ingredient> = new Map();
  ingredientsByName: Map<string, string[]> = new Map();
  contraindicationIndex: Map<string, ContraindicationPair[]> = new Map();
  supplementInteractions: SupplementDrugInteraction[] = [];
  duplicateGroups: DuplicateIngredientGroup[] = [];
  elderlyCautionByCode: Map<string, ElderlyCaution[]> = new Map();

  private loaded = false;

  load(): void {
    if (this.loaded) return;

    console.log('[DataLoader] Loading drug safety data...');
    const start = Date.now();

    this.loadIngredients();
    this.loadContraindicationPairs();
    this.loadSupplementInteractions();
    this.loadDuplicateGroups();
    this.loadElderlyCaution();

    this.loaded = true;
    console.log(`[DataLoader] Done in ${Date.now() - start}ms`);
    console.log(`[DataLoader] Ingredients: ${this.ingredientsByCode.size}`);
    console.log(`[DataLoader] Contraindication index keys: ${this.contraindicationIndex.size}`);
    console.log(`[DataLoader] Supplement interactions: ${this.supplementInteractions.length}`);
    console.log(`[DataLoader] Duplicate groups: ${this.duplicateGroups.length}`);
    console.log(`[DataLoader] Elderly caution codes: ${this.elderlyCautionByCode.size}`);
  }

  private readJson<T>(filename: string): T {
    const filePath = path.join(DATA_DIR, filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  }

  private loadIngredients(): void {
    const items = this.readJson<Ingredient[]>('ingredients.json');
    for (const item of items) {
      this.ingredientsByCode.set(item.ingredient_code, item);

      const nameLower = item.ingredient_name_eng.toLowerCase();
      const existing = this.ingredientsByName.get(nameLower) || [];
      existing.push(item.ingredient_code);
      this.ingredientsByName.set(nameLower, existing);

      if (item.ingredient_name_kor) {
        const korExisting = this.ingredientsByName.get(item.ingredient_name_kor) || [];
        korExisting.push(item.ingredient_code);
        this.ingredientsByName.set(item.ingredient_name_kor, korExisting);
      }
    }
  }

  private loadContraindicationPairs(): void {
    const pairs = this.readJson<ContraindicationPair[]>('contraindication_pairs.json');
    for (const pair of pairs) {
      const [a, b] = [pair.ingredient_code_a, pair.ingredient_code_b].sort();
      const key = `${a}|${b}`;
      const existing = this.contraindicationIndex.get(key) || [];
      existing.push(pair);
      this.contraindicationIndex.set(key, existing);
    }
  }

  private loadSupplementInteractions(): void {
    this.supplementInteractions = this.readJson<SupplementDrugInteraction[]>(
      'supplement_drug_interactions.json',
    );
  }

  private loadDuplicateGroups(): void {
    this.duplicateGroups = this.readJson<DuplicateIngredientGroup[]>(
      'duplicate_ingredient_groups.json',
    );
  }

  private loadElderlyCaution(): void {
    const items = this.readJson<ElderlyCaution[]>('elderly_caution.json');
    for (const item of items) {
      const existing = this.elderlyCautionByCode.get(item.ingredient_code) || [];
      existing.push(item);
      this.elderlyCautionByCode.set(item.ingredient_code, existing);
    }
  }

  findIngredientCodes(ingredientName: string): string[] {
    if (!ingredientName) return [];
    const nameLower = ingredientName.toLowerCase().trim();

    // Exact match first
    const exact = this.ingredientsByName.get(nameLower);
    if (exact && exact.length > 0) return exact;

    // Partial match: search ingredient names that contain the query
    const results: string[] = [];
    for (const [name, codes] of this.ingredientsByName) {
      if (name.includes(nameLower) || nameLower.includes(name)) {
        results.push(...codes);
      }
    }
    return [...new Set(results)];
  }

  findContraindications(codeA: string, codeB: string): ContraindicationPair[] {
    const [a, b] = [codeA, codeB].sort();
    return this.contraindicationIndex.get(`${a}|${b}`) || [];
  }

  findSupplementInteraction(
    supplementName: string,
    drugIngredient: string,
  ): SupplementDrugInteraction | undefined {
    const suppLower = supplementName.toLowerCase();
    const drugLower = drugIngredient.toLowerCase();
    return this.supplementInteractions.find(
      (si) =>
        (si.supplement_name_eng.toLowerCase().includes(suppLower) ||
          si.supplement_name_kor.includes(supplementName) ||
          suppLower.includes(si.supplement_name_eng.toLowerCase())) &&
        (si.drug_ingredient_eng.toLowerCase().includes(drugLower) ||
          si.drug_ingredient_kor.includes(drugIngredient) ||
          drugLower.includes(si.drug_ingredient_eng.toLowerCase())),
    );
  }

  findDuplicateGroup(ingredientName: string): DuplicateIngredientGroup | undefined {
    const nameLower = ingredientName.toLowerCase();
    return this.duplicateGroups.find(
      (g) =>
        g.ingredient_eng.toLowerCase() === nameLower ||
        g.ingredient_kor === ingredientName ||
        g.aliases.some(
          (a) => a.toLowerCase() === nameLower || nameLower.includes(a.toLowerCase()),
        ),
    );
  }

  findElderlyCaution(ingredientCode: string): ElderlyCaution[] {
    return this.elderlyCautionByCode.get(ingredientCode) || [];
  }
}

export const dataLoader = new DataLoaderService();
