import sharp from 'sharp';

const MAX_DIMENSION = 2000;

export const imagePreprocessor = {
  async preprocess(imageBuffer: Buffer): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || MAX_DIMENSION;
    const height = metadata.height || MAX_DIMENSION;

    let pipeline = sharp(imageBuffer);

    // Resize if too large (keep aspect ratio)
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Grayscale + contrast enhancement for OCR
    pipeline = pipeline
      .grayscale()
      .normalise()
      .sharpen();

    return pipeline.png().toBuffer();
  },
};
