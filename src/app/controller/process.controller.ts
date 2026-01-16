import { Request, Response } from "express";

import { OCRService } from "../service/ocr.service";
import { ClassifierService } from "../service/classifier.service";
import { ReasoningService } from "../service/reasoning.service";
import { GuardrailService } from "../service/guardrail.service";

import { normalizeCurrency } from "../../core/normalization/currency";
import { NumberNormalizer } from "../../core/normalization/number";

import { LabeledAmount } from "../../shared/types/bill.types";

const ocrService = new OCRService();
const classifierService = new ClassifierService();
const reasoningService = new ReasoningService();
const guardrailService = new GuardrailService();
const numberNormalizer = new NumberNormalizer();

export const processBillController = async (req: Request, res: Response) => {
  try {
    let rawText = "";
    let ocrConfidence = 0;
    let classificationSource: "rule" | "llm" = "rule";

    const showSteps = req.query.debug === "true";
    const intermediateSteps: any = {};

    // Step 1: OCR/Text Extraction
    if (req.file) {
      const ocrResult = await ocrService.extract(req.file.path);

      rawText = ocrResult.raw_text ?? "";
      ocrConfidence = ocrResult.confidence || 0.7;

      if (showSteps) {
        intermediateSteps.step1_ocr = {
          raw_tokens: ocrResult.raw_tokens || [],
          currency_hint: "INR",
          confidence: ocrResult.confidence || 0.7
        };
      }

      if (ocrResult.status === "no_amounts_found") {
        return res.status(422).json(ocrResult);
      }
    } else if (req.body.text) {
      rawText = req.body.text;
      ocrConfidence = 1.0;

      if (showSteps) {
        intermediateSteps.step1_ocr = {
          raw_tokens: rawText.match(/\d+(?:,\d{3})*(?:\.\d{2})?/g) || [],
          currency_hint: "INR",
          confidence: 1.0
        };
      }
    } else {
      return res.status(400).json({
        status: "bad_request",
        reason: "no file or text provided",
      });
    }

    // Step 2: Normalization
    const currencyInfo = normalizeCurrency(rawText);
    const normalizedContext = numberNormalizer.normalize(rawText);
    const normalizationConf = normalizedContext.normalizationConfidence;

    if (showSteps) {
      intermediateSteps.step2_normalization = {
        normalized_amounts: normalizedContext.normalizedTokens.map(t => t.numeric),
        normalization_confidence: parseFloat(normalizationConf.toFixed(2))
      };
    }

    // Step 3: Classification
    const classification = await classifierService.classify(rawText);
    if (classification.source === "llm") {
      classificationSource = "llm";
    }

    let labeled: LabeledAmount[] = classification.amounts || [];
    const classificationConf = classification.confidence || 0.3;

    if (showSteps) {
      intermediateSteps.step3_classification = {
        amounts: labeled.map(a => ({
          type: a.type,
          value: a.value
        })),
        confidence: parseFloat(classificationConf.toFixed(2))
      };
    }

    // Step 4: Reasoning
    const reasoningResult = reasoningService.infer(labeled);
    labeled = reasoningResult.amounts;
    const reasoningConf = reasoningResult.reasoningConfidence;

    // Step 5: Guardrails
    const guardrailEval = guardrailService.validate(labeled);
    if (!guardrailEval.isValid) {
      return res.status(422).json({
        status: guardrailEval.status,
        reason: guardrailEval.reason,
      });
    }

    // Step 6: Composite Confidence
    const finalConfidence = parseFloat(
      (
        reasoningConf * 0.3 +
        ocrConfidence * 0.2 +
        classificationConf * 0.3 +
        normalizationConf * 0.2
      ).toFixed(3)
    );

    // Step 7: Final Output
    const baseResponse = {
      status: "ok",
      currency: currencyInfo.code,
      amounts: labeled.map((a) => ({
        type: a.type,
        value: a.value,
        source: a.source,
      })),
    };

    // If debug mode: add ALL extra information
    if (showSteps) {
      return res.status(200).json({
        ...baseResponse,
        classification_source: classificationSource,
        confidence: finalConfidence,
        confidence_breakdown: {
          ocr: parseFloat(ocrConfidence.toFixed(3)),
          classification: parseFloat(classificationConf.toFixed(3)),
          normalization: parseFloat(normalizationConf.toFixed(3)),
          reasoning: parseFloat(reasoningConf.toFixed(3)),
        },
        intermediate_steps: intermediateSteps,
      });
    }

    // Default: return clean response
    return res.status(200).json(baseResponse);

  } catch (err) {
    console.error("Process Error:", err);
    return res
      .status(500)
      .json({ status: "error", reason: "internal server error" });
  }
};