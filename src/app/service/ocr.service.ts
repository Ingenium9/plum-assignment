import { createWorker } from 'tesseract.js';
import path from 'path';
import fs from 'fs';

import { preprocessImage } from '../../core/ocr/image-preprocess';
import { EXTRACT_NUMBER_REGEX } from '../../shared/constants/patterns';

export class OCRService {

  async extract(imagePath: string) {
    const processedPath = path.join(
      path.dirname(imagePath),
      'processed_' + path.basename(imagePath)
    );

    // Step 1: Enhance Image
    await preprocessImage(imagePath, processedPath);

    // Step 2: Init Tesseract
    const worker = await createWorker('eng');

    // Step 3: OCR
    const { data } = await worker.recognize(processedPath);

    await worker.terminate();

    // Cleanup tmp file
    if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);

    const rawText: string = data.text || '';
    const confidence = (data.confidence || 60) / 100;

    // Step 4: Extract numeric tokens
    const rawTokens = rawText.match(EXTRACT_NUMBER_REGEX) || [];

    if (rawTokens.length === 0) {
      return {
        status: 'no_amounts_found',
        reason: 'document too noisy'
      };
    }

    return {
      raw_text: rawText,
      raw_tokens: rawTokens,
      confidence
    };
  }
}
