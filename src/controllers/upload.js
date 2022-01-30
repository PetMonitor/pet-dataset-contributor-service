const http = require('http');
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
                    orderBy: 'name_natural desc',
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
                                var strBase64 = Buffer.from(file.buffer).toString('base64');
                                const fileMetadata = {
                                    name: idx + path.extname(file.originalname).toLowerCase(),
                                    parents: [fileResponse.data.id]
                                };
                                preprocessAndUploadFilesToDrive(file, fileMetadata, strBase64, res);
                                console.log("img processed")
                            });
                            res.render('upload', {
                                msg: 'Imágenes cargadas correctamente'
                            });
                        }).catch(error => {
                        res.status(500).send("Error while uploading photos into Drive: " + error);
                    });
                }).catch(error => {
                    res.status(500).send("Error while retrieving files from Drive: " + error);
                });
            }
        }
    })
};

/**
 * Sends the given photo to the preprocessor service and uploads the preprocessed faces to the dataset in drive.
 */
function preprocessAndUploadFilesToDrive(file, fileMetadata, strBase64, response) {
    const photosToPreprocess = JSON.stringify({
        'petImages': [strBase64]
    });

    const options = {
        host: process.env.PREPROCESS_SERVICE_HOST || "127.0.0.1",
        port: process.env.PREPROCESS_SERVICE_PORT || 5000,
        path: '/api/v0/preprocessed-images',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(photosToPreprocess)
        }
    };

    const req = http.request(options, function(innerResponse) {
        innerResponse.setEncoding('utf8');
        var body = "";
        innerResponse.on('data', function(resData) {
            body += resData;
        });
        innerResponse.on('end', () => {
            uploadFileCallback(file, fileMetadata, JSON.parse(body), response);
        });
    });

    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });

    // Write data to request body
    req.write(photosToPreprocess);
    req.end();
}

function uploadFileCallback(file, fileMetadata, response, res) {
    // TODO: refactor code - we only send one request per file, so it's expected to only have one element in the response
    if (response["petImages"][0].length > 0) {
        let bufferStream = new stream.PassThrough();
        bufferStream.end(Buffer.from(response["petImages"][0][0], 'base64'));
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
    }
}

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
