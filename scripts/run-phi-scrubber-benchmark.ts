import fs from 'node:fs';
import path from 'node:path';
import { scrubText } from '../src/tools/phi-scrubber/engine';
import { PhiEntity } from '../src/tools/phi-scrubber/types';

interface ExpectedEntity {
  text: string;
  category: string;
  ruleId: string;
  start: number;
  end: number;
  isStructured: boolean;
  difficulty: 'easy_structured' | 'hard_unstructured';
}

interface Snippet {
  id: string;
  categoryPrimary: string;
  text: string;
  expected_entities: ExpectedEntity[];
}

interface FalseNegativeRecord {
  snippetId: string;
  ruleId: string;
  category: string;
  text: string;
  isStructured: boolean;
  contextSnippet: string;
  rootCause: string;
}

interface FalsePositiveRecord {
  snippetId: string;
  ruleId: string;
  category: string;
  text: string;
  contextSnippet: string;
}

interface CategoryStats {
  category: string;
  ruleId: string;
  totalExpected: number;
  truePositives: number;
  falseNegatives: number;
  recall: number;
  structuredExpected: number;
  structuredDetected: number;
  structuredRecall: number;
  unstructuredExpected: number;
  unstructuredDetected: number;
  unstructuredRecall: number;
}

function analyzeBenchmark() {
  const corpusPath = path.resolve(process.cwd(), 'tests/synthetic_phi_gold_standard.json');
  if (!fs.existsSync(corpusPath)) {
    console.error(`Corpus not found at ${corpusPath}`);
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

  const falseNegativesList: FalseNegativeRecord[] = [];
  const falsePositivesList: FalsePositiveRecord[] = [];

  // Helper to diagnose root cause
  function diagnoseMiss(exp: ExpectedEntity, text: string): string {
    if (exp.ruleId === 'NAME') {
      if (!exp.isStructured) {
        if (/^[a-z]/.test(exp.text)) return 'Regex requires capitalized name; lowercase name omitted';
        if (!/\s/.test(exp.text)) return 'Regex requires two tokens or title prefix; single first name omitted';
        if (/[éèáíóúñüöä]/i.test(exp.text)) return 'Regex character class [A-Za-z] excludes accented unicode characters';
        return 'Regex requires prefix (Patient:, Dr., Dictated by:); unlabelled narrative name omitted';
      }
    }
    if (exp.ruleId === 'GEOGRAPHIC') {
      if (!exp.isStructured) {
        if (/(hospital|clinic|center|medical)/i.test(exp.text)) return 'No Safe Harbor regex pattern for hospital/facility entities';
        if (/(google|boeing|amazon|target|stanford)/i.test(exp.text)) return 'No Safe Harbor regex pattern for employer/university entities';
        if (/(county)/i.test(exp.text)) return 'No Safe Harbor regex pattern for standalone county subdivisions';
        return 'Regex requires street suffix or City, State Zip; standalone city omitted';
      }
    }
    if (exp.ruleId === 'DATE') {
      if (!exp.isStructured) {
        if (/^\d{4}$/.test(exp.text)) return 'No Safe Harbor regex pattern for standalone birth/event year';
        return 'Regex requires MM/DD/YYYY or month+day+year; natural language date without year omitted';
      }
    }
    if (exp.ruleId === 'PHONE') {
      if (!exp.isStructured && /^\d{10}$/.test(exp.text)) return 'Regex requires delimiters or label prefix for unpunctuated 10-digit number';
    }
    if (exp.ruleId === 'MRN' && !exp.isStructured) {
      return 'Regex requires MRN/MR# prefix; unlabelled alphanumeric hospital chart ID omitted';
    }
    if (exp.ruleId === 'HEALTH_PLAN_NUM' && !exp.isStructured) {
      return 'Regex requires carrier prefix (BCBS, AETNA) or Member ID prefix; unlabelled policy ID omitted';
    }
    if (exp.ruleId === 'LICENSE_NUM' && !exp.isStructured) {
      return 'Regex requires NPI or License prefix; unlabelled license ID omitted';
    }
    if (exp.ruleId === 'VEHICLE_ID' && !exp.isStructured) {
      return 'Regex requires VIN or Plate prefix; unlabelled license plate omitted';
    }
    if (exp.ruleId === 'DEVICE_ID' && !exp.isStructured) {
      return 'Regex requires Serial/Device prefix; unlabelled hardware ID omitted';
    }
    return `Unmatched by safeHarborRules pattern for ${exp.ruleId}`;
  }

  for (const snippet of corpus) {
    const res = scrubText(snippet.text, { maskStyle: 'tag' });
    const predicted = res.entities;
    totalPredicted += predicted.length;

    // Track matched predicted entities for false positive calculation
    const matchedPredictedIndices = new Set<number>();

    for (const exp of snippet.expected_entities) {
      totalExpected++;
      if (exp.isStructured) totalStructuredExpected++;
      else totalUnstructuredExpected++;

      // Check category map
      if (!categoryMap.has(exp.ruleId)) {
        categoryMap.set(exp.ruleId, {
          category: exp.category,
          ruleId: exp.ruleId,
          totalExpected: 0,
          truePositives: 0,
          falseNegatives: 0,
          recall: 0,
          structuredExpected: 0,
          structuredDetected: 0,
          structuredRecall: 0,
          unstructuredExpected: 0,
          unstructuredDetected: 0,
          unstructuredRecall: 0,
        });
      }
      const cStat = categoryMap.get(exp.ruleId)!;
      cStat.totalExpected++;
      if (exp.isStructured) cStat.structuredExpected++;
      else cStat.unstructuredExpected++;

      // Overlap matching: does any predicted entity cover or overlap with expected?
      let foundIndex = -1;
      for (let i = 0; i < predicted.length; i++) {
        const pred = predicted[i];
        // Check for non-empty overlap
        const maxStart = Math.max(pred.start, exp.start);
        const minEnd = Math.min(pred.end, exp.end);
        if (maxStart < minEnd) {
          foundIndex = i;
          matchedPredictedIndices.add(i);
          break;
        }
      }

      if (foundIndex !== -1) {
        totalTruePositives++;
        cStat.truePositives++;
        if (exp.isStructured) {
          totalStructuredTP++;
          cStat.structuredDetected++;
        } else {
          totalUnstructuredTP++;
          cStat.unstructuredDetected++;
        }
      } else {
        totalFalseNegatives++;
        cStat.falseNegatives++;
        falseNegativesList.push({
          snippetId: snippet.id,
          ruleId: exp.ruleId,
          category: exp.category,
          text: exp.text,
          isStructured: exp.isStructured,
          contextSnippet: snippet.text.substring(Math.max(0, exp.start - 25), Math.min(snippet.text.length, exp.end + 25)),
          rootCause: diagnoseMiss(exp, snippet.text),
        });
      }
    }

    // False Positives: predicted entities that did not overlap with any expected entity
    for (let i = 0; i < predicted.length; i++) {
      if (!matchedPredictedIndices.has(i)) {
        const p = predicted[i];
        totalFalsePositives++;
        falsePositivesList.push({
          snippetId: snippet.id,
          ruleId: p.ruleId,
          category: p.category,
          text: p.originalValue,
          contextSnippet: snippet.text.substring(Math.max(0, p.start - 25), Math.min(snippet.text.length, p.end + 25)),
        });
      }
    }
  }

  // Calculate percentages
  const overallRecall = totalExpected > 0 ? (totalTruePositives / totalExpected) * 100 : 0;
  const overallPrecision = totalTruePositives + totalFalsePositives > 0 ? (totalTruePositives / (totalTruePositives + totalFalsePositives)) * 100 : 0;
  const overallF1 = overallPrecision + overallRecall > 0 ? (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall) : 0;

  const structuredRecall = totalStructuredExpected > 0 ? (totalStructuredTP / totalStructuredExpected) * 100 : 0;
  const unstructuredRecall = totalUnstructuredExpected > 0 ? (totalUnstructuredTP / totalUnstructuredExpected) * 100 : 0;

  // Process category stats
  const categoryResults: CategoryStats[] = [];
  for (const [, stat] of categoryMap) {
    stat.recall = stat.totalExpected > 0 ? (stat.truePositives / stat.totalExpected) * 100 : 0;
    stat.structuredRecall = stat.structuredExpected > 0 ? (stat.structuredDetected / stat.structuredExpected) * 100 : 0;
    stat.unstructuredRecall = stat.unstructuredExpected > 0 ? (stat.unstructuredDetected / stat.unstructuredExpected) * 100 : 0;
    categoryResults.push(stat);
  }

  // Sort by rule order
  const ruleOrder = [
    'NAME', 'GEOGRAPHIC', 'DATE', 'PHONE', 'FAX', 'EMAIL',
    'SSN', 'MRN', 'HEALTH_PLAN_NUM', 'ACCOUNT_NUM', 'LICENSE_NUM',
    'VEHICLE_ID', 'DEVICE_ID', 'URL', 'IP_ADDRESS', 'BIOMETRIC',
    'PHOTO_ID', 'UNIQUE_ID',
  ];
  categoryResults.sort((a, b) => ruleOrder.indexOf(a.ruleId) - ruleOrder.indexOf(b.ruleId));

  const outputData = {
    benchmark_metadata: {
      date: '2026-10-05',
      corpus_size_snippets: corpus.length,
      total_expected_entities: totalExpected,
      total_structured_entities: totalStructuredExpected,
      total_unstructured_entities: totalUnstructuredExpected,
    },
    metrics: {
      overall_recall: Number(overallRecall.toFixed(2)),
      overall_precision: Number(overallPrecision.toFixed(2)),
      overall_f1: Number(overallF1.toFixed(2)),
      true_positives_count: totalTruePositives,
      false_negatives_count: totalFalseNegatives,
      false_positives_count: totalFalsePositives,
      structured_recall: Number(structuredRecall.toFixed(2)),
      unstructured_recall: Number(unstructuredRecall.toFixed(2)),
    },
    category_performance: categoryResults.map((c) => ({
      rule_id: c.ruleId,
      category_name: c.category,
      total_expected: c.totalExpected,
      true_positives: c.truePositives,
      false_negatives: c.falseNegatives,
      recall_percent: Number(c.recall.toFixed(2)),
      structured_recall_percent: Number(c.structuredRecall.toFixed(2)),
      unstructured_recall_percent: Number(c.unstructuredRecall.toFixed(2)),
    })),
    false_negatives_breakdown: {
      total_count: falseNegativesList.length,
      sample_false_negatives: falseNegativesList,
    },
    false_positives_breakdown: {
      total_count: falsePositivesList.length,
      sample_false_positives: falsePositivesList,
    },
    architectural_llm_audit: {
      outbound_llm_scrubber_enforced: false,
      leaked_call_paths: [
        {
          file: 'src/tools/scribe/ai-template-generator.ts',
          line: 265,
          function: 'generateClinicalNote',
          payload_inspected: 'raw transcript, context.patient_name, context.mrn, context.clinician_name',
          scrub_text_called: false,
          leak_risk: 'CRITICAL'
        },
        {
          file: 'src/tools/theraflow/ai-note-expander.ts',
          line: 42,
          function: 'expandShorthandToDAP',
          payload_inspected: 'raw clientName, diagnosis, shorthand transcript',
          scrub_text_called: false,
          leak_risk: 'CRITICAL'
        }
      ],
      isolated_ui_paths: [
        {
          file: 'src/tools/phi-scrubber/PhiScrubberView.tsx',
          description: 'Standalone playground view at /dashboard/phi-scrubber requiring manual paste or manual button navigation.'
        }
      ]
    }
  };

  const resultsPath = path.resolve(process.cwd(), 'phi_scrubber_benchmark_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`Saved benchmark results to: ${resultsPath}`);

  console.log('\n================ BENCHMARK RESULTS SUMMARY ================');
  console.log(`Overall Recall:        ${overallRecall.toFixed(2)}% (${totalTruePositives}/${totalExpected})`);
  console.log(`Overall Precision:     ${overallPrecision.toFixed(2)}% (${totalTruePositives}/${totalTruePositives + totalFalsePositives})`);
  console.log(`Overall F1 Score:      ${overallF1.toFixed(2)}%`);
  console.log(`Structured Recall:     ${structuredRecall.toFixed(2)}% (${totalStructuredTP}/${totalStructuredExpected})`);
  console.log(`Unstructured Recall:   ${unstructuredRecall.toFixed(2)}% (${totalUnstructuredTP}/${totalUnstructuredExpected})`);
  console.log(`Total False Negatives: ${totalFalseNegatives}`);
  console.log(`Total False Positives: ${totalFalsePositives}`);
  console.log('===========================================================\n');

  console.log('CATEGORY BREAKDOWN:');
  for (const c of categoryResults) {
    console.log(
      `- [${c.ruleId.padEnd(16)}] Recall: ${c.recall.toFixed(1).padStart(5)}% (Structured: ${c.structuredRecall.toFixed(1).padStart(5)}% | Unstructured: ${c.unstructuredRecall.toFixed(1).padStart(5)}%) [Exp: ${c.totalExpected}, TP: ${c.truePositives}, FN: ${c.falseNegatives}]`
    );
  }
}

analyzeBenchmark();
