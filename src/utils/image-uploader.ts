import { v2 as cloudinary } from 'cloudinary';

import { logger } from './logger';

export async function uploadImages(imageFiles: Express.Multer.File[]) {
    // upload images to cloudinary

    logger.info('Uploading images to Cloudinary', {
        imageCount: imageFiles.length,
    });
    const promises = imageFiles.map(async image => {
        const b64 = Buffer.from(image.buffer).toString('base64');
        const dataURI = `data:${image.mimetype};base64,${b64}`;
        const res = await cloudinary.uploader.upload(dataURI);

        return res.secure_url;
    });
    return await Promise.all(promises);
}
