import sharp from 'sharp';

export const preprocessImage = async (inputPath: string, outputPath: string) => {
  await sharp(inputPath)
    .grayscale()
    .normalize()
    .sharpen()
    .toFile(outputPath);
};
