/**
 * Benchmark Runner for Fresh Blind Synthetic PHI Holdout Corpus
 * 
 * Evaluates the TheraFlow Safe Harbor PHI Scrubber against the frozen
 * blind holdout corpus (tests/synthetic_phi_fresh_holdout_corpus.json).
 * 
 * Reports:
 * - number of snippets
 * - number of entities
 * - overall recall
 * - precision
 * - F1
 * - structured recall
 * - unstructured recall
 * - false negatives
 * - false positives
 * 
 * Note: Regardless of the score achieved, TheraFlow OS does not claim
 * Safe Harbor compliance.
 */

import fs from 'fs';
import path from 'path';
import { scrubText } from '../src/tools/phi-scrubber/engine';

interface EntityAnnotation {
  text: string;
  category: string;
  ruleId: string;
  start: number;
  end: number;
  isStructured: boolean;
  difficulty: 'easy_structured' | 'medium_hybrid' | 'hard_unstructured';
}

interface Snippet {
  id: string;
  categoryPrimary: string;
  text: string;
  expected_entities: EntityAnnotation[];
}

interface CategoryStats {
  category: string;
  totalExpected: number;
  truePositives: number;
  falseNegatives: number;
  recall: number;
  structuredExpected: number;
  structuredDetected: number;
  unstructuredExpected: number;
  unstructuredDetected: number;
}

function runFreshHoldoutEvaluation() {
  console.log('====================================================================');
  console.log('   SECTION 8: FRESH BLIND SYNTHETIC PHI HOLDOUT BENCHMARK           ');
  console.log('====================================================================\n');

  const corpusPath = path.resolve(process.cwd(), 'tests/synthetic_phi_fresh_holdout_corpus.json');
  if (!fs.existsSync(corpusPath)) {
    console.error(`Corpus file not found at ${corpusPath}`);
    process.exit(1);
  }

  const corpus: Snippet[] = JSON.parse(fs.readFileSync(corpusPath, 'utf-8'));

  let totalExpected = 0;
  let totalTruePositives = 0;
  let totalFalseNegatives = 0;
  let totalFalsePositives = 0;
  let totalPredicted = 0;

  let totalStructuredExpected = 0;
  let totalStructuredTP = 0;

  let totalUnstructuredExpected = 0;
  let totalUnstructuredTP = 0;

  const categoryMap = new Map<string, CategoryStats>();
  const falseNegativesList: Array<{ snippetId: string; category: string; text: string; isStructured: boolean }> = [];
  const falsePositivesList: Array<{ snippetId: string; text: string; category: string }> = [];

  for (const snippet of corpus) {
    const scrubbed = scrubText(snippet.text, { preserveOffsets: true });
    const detectedEntities = scrubbed.entities;
    totalPredicted += detectedEntities.length;

    // Evaluate each ground-truth expected entity
    for (const exp of snippet.expected_entities) {
      totalExpected++;
      if (exp.isStructured) totalStructuredExpected++;
      else totalUnstructuredExpected++;

      if (!categoryMap.has(exp.category)) {
        categoryMap.set(exp.category, {
          category: exp.category,
          totalExpected: 0,
          truePositives: 0,
          falseNegatives: 0,
          recall: 0,
          structuredExpected: 0,
          structuredDetected: 0,
          unstructuredExpected: 0,
          unstructuredDetected: 0,
        });
      }
      const stats = categoryMap.get(exp.category)!;
      stats.totalExpected++;
      if (exp.isStructured) stats.structuredExpected++;
      else stats.unstructuredExpected++;

      // Check span overlap
      const matched = detectedEntities.some((det) => {
        const overlapStart = Math.max(exp.start, det.start);
        const overlapEnd = Math.min(exp.end, det.end);
        return overlapStart < overlapEnd;
      });

      if (matched) {
        totalTruePositives++;
        stats.truePositives++;
        if (exp.isStructured) {
          totalStructuredTP++;
          stats.structuredDetected++;
        } else {
          totalUnstructuredTP++;
          stats.unstructuredDetected++;
        }
      } else {
        totalFalseNegatives++;
        stats.falseNegatives++;
        falseNegativesList.push({
          snippetId: snippet.id,
          category: exp.category,
          text: exp.text,
          isStructured: exp.isStructured,
        });
      }
    }

    // Evaluate false positives: detected spans that overlap no ground-truth expected entity
    for (const det of detectedEntities) {
      const isTP = snippet.expected_entities.some((exp) => {
        const overlapStart = Math.max(exp.start, det.start);
        const overlapEnd = Math.min(exp.end, det.end);
        return overlapStart < overlapEnd;
      });

      if (!isTP) {
        totalFalsePositives++;
        falsePositivesList.push({
          snippetId: snippet.id,
          text: det.originalValue,
          category: det.category,
        });
      }
    }
  }

  const overallRecall = totalExpected > 0 ? totalTruePositives / totalExpected : 0;
  const precision = totalPredicted > 0 ? (totalPredicted - totalFalsePositives) / totalPredicted : 0;
  const f1 = precision + overallRecall > 0 ? (2 * precision * overallRecall) / (precision + overallRecall) : 0;

  const structuredRecall = totalStructuredExpected > 0 ? totalStructuredTP / totalStructuredExpected : 0;
  const unstructuredRecall = totalUnstructuredExpected > 0 ? totalUnstructuredTP / totalUnstructuredExpected : 0;

  console.log('--- Fresh Blind Holdout Evaluation Results ---');
  console.log(`Number of Snippets:       ${corpus.length}`);
  console.log(`Number of Entities:       ${totalExpected}`);
  console.log(`Total Predicted Spans:    ${totalPredicted}`);
  console.log(`True Positives (TP):      ${totalTruePositives}`);
  console.log(`False Negatives (FN):     ${totalFalseNegatives}`);
  console.log(`False Positives (FP):     ${totalFalsePositives}`);
  console.log(`Overall Recall:           ${(overallRecall * 100).toFixed(2)}%`);
  console.log(`Precision:                ${(precision * 100).toFixed(2)}%`);
  console.log(`F1 Score:                 ${(f1 * 100).toFixed(2)}%`);
  console.log(`Structured Recall:        ${(structuredRecall * 100).toFixed(2)}% (${totalStructuredTP}/${totalStructuredExpected})`);
  console.log(`Unstructured Recall:      ${(unstructuredRecall * 100).toFixed(2)}% (${totalUnstructuredTP}/${totalUnstructuredExpected})`);

  console.log('\n--- Category Breakdown ---');
  for (const [cat, stats] of categoryMap.entries()) {
    const catRecall = stats.totalExpected > 0 ? (stats.truePositives / stats.totalExpected) * 100 : 0;
    console.log(`  • ${cat.padEnd(25)}: ${catRecall.toFixed(1)}% (${stats.truePositives}/${stats.totalExpected})`);
  }

  if (falseNegativesList.length > 0) {
    console.log(`\nSample False Negatives (${falseNegativesList.length} total):`);
    for (const fn of falseNegativesList.slice(0, 5)) {
      console.log(`  - [${fn.snippetId}] (${fn.category}): "${fn.text}" (structured: ${fn.isStructured})`);
    }
  }

  if (falsePositivesList.length > 0) {
    console.log(`\nSample False Positives (${falsePositivesList.length} total):`);
    for (const fp of falsePositivesList.slice(0, 5)) {
      console.log(`  - [${fp.snippetId}] (${fp.category}): "${fp.text}"`);
    }
  }

  console.log('\n====================================================================');
  console.log('   REGULATORY NOTICE:                                              ');
  console.log('   Scores reflect automated heuristic evaluation on synthetic data. ');
  console.log('   TheraFlow OS does NOT claim statutory Safe Harbor compliance.    ');
  console.log('====================================================================\n');
}

runFreshHoldoutEvaluation();
