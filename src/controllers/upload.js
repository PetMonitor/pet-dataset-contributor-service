const stream = require('stream');
const path = require('path');
const multer = require('multer');

const driveImagesHandler = require('../utils/drive-images-handler');

const upload = multer({
    fileFilter: (req, file, callback) => {
        checkFileType(file, callback);
    }
}).array('petImages', 10);

/**
 * Handles the request to upload a set of files into our Google Drive pet data sets.
 */
const uploadFilesToDrive = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            res.render('upload', {
                msg: err
            })
        } else {
            if (req.files.length < 3 ) {
                res.render('upload', {
                    msg: 'Seleccionar al menos 3 imágenes de la mascota'
                });
            } else {
                let parentFolder = getDatasetFolder(req.body.selectedPet);
                driveImagesHandler.listFiles({
                    pageSize: 1,
                    fields: 'files(name)',
                    orderBy: 'name desc',
                    q: `'${parentFolder}' in parents`
                }).then(filesResponse => {
                    let datasetPetFiles = filesResponse.data.files;
                    let folderName = 0;
                    if (datasetPetFiles.length !== 0) {
                        folderName = parseInt(datasetPetFiles[0].name) + 1;
                    }
                    const fileMetadata = {
                        mimeType: 'application/vnd.google-apps.folder',
                        name: folderName,
                        parents: [parentFolder]
                    };
                    driveImagesHandler.uploadFile(fileMetadata, {})
                        .then(fileResponse => {
                            req.files.forEach((file, idx) => {
                                let bufferStream = new stream.PassThrough();
                                bufferStream.end(file.buffer);
                                const fileMetadata = {
                                    name: idx + path.extname(file.originalname).toLowerCase(),
                                    parents: [fileResponse.data.id]
                                };
                                const media = {
                                    mimeType: file.mimetype,
                                    body: bufferStream
                                };
                                driveImagesHandler.uploadFile(fileMetadata, media)
                                    .then(imageResponse => {
                                        if (imageResponse.status !== 200) {
                                            res.status(imageResponse.status)
                                                .send(`Error while uploading file ${file.originalname} into the dataset's Drive folder`);
                                        }
                                    }).catch(error => {
                                    res.status(500).send(error);
                                });
                            });
                            res.render('upload', {
                                msg: 'Imágenes cargadas correctamente'
                            });
                        }).catch(error => {
                        res.status(500).send("Error while uploading photos into Drive: " + error);
                    });
                }).catch(error => {
                    res.status(500).send("Error while retrieving files from Drvie: " + error);
                });
            }
        }
    })
};

/**
 * Validates that the provided file to upload matches the expected mime type and file extension.
 */
function checkFileType(file, callback) {
    // we define the allowed extensions
    const fileTypes = /jpeg|jpg|png/;
    // check the extension
    const validExtension = fileTypes.test(path.extname(file.originalname).toLowerCase());
    // check mime type
    const validMimeType = fileTypes.test(file.mimetype);

    return validExtension && validMimeType ?
        callback(null, true) : callback('Error: We only support images')
}

/**
 * Retrieves the corresponding drive folder id based on the type of pet selected to upload the photos.
 */
function getDatasetFolder(selectedPet) {
    switch (selectedPet) {
        case "dog":
            return '1vjSUGjexsbcdl7jWg-uLvxbKjSVpYZgx';
        case "cat":
            return '1sG-L1Rss0RkkiNWx6VeinlWEMBhBhMj2';
        default:
            console.log("Tried to upload files without selecting an option")
    }
}

module.exports = {
    uploadFilesToDrive,
};
