// eslint-disable-next-line @typescript-eslint/ban-types
export const fileFilter = (req: Express.Request, file: Express.Multer.File, callback:Function) =>{

    if (!file) return callback(new Error('No file uploaded'), false);

    const fileExtension = file.mimetype.split('/')[1]?.toLowerCase();
    const originalExtension = file.originalname.split('.').pop()?.toLowerCase();
    
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'svg+xml', 'bmp'];

    if (validExtensions.includes(fileExtension) || (originalExtension && validExtensions.includes(originalExtension))) { 
        return callback(null, true)
    }

    callback(null, false)
}