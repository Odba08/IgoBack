// eslint-disable-next-line @typescript-eslint/ban-types
export const fileFilter = (req: Express.Request, file: Express.Multer.File, callback:Function) =>{

    if (!file) return callback(new Error('No file uploaded'), false);

    const fileExtension = file.mimetype.split('/')[1];
    const validExtensios = ['jpg', 'jpeg', 'png', 'gif'];

    if (validExtensios.includes(fileExtension) ){ 
        return callback(null, true)
    }

    callback(null, false)

}