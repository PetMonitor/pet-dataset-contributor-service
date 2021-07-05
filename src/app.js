const express = require('express');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');

const driveImagesHandler = require('./drive-images-handler');

// Init app
const app = express();
const port = 3000;

const upload = multer({
    fileFilter: (req, file, callback) => {
        checkFileType(file, callback);
    }
}).array('petImages', 5);

// EJS
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);

// logs
app.use(morgan('combined'));

app.get('/', (req, res) => res.render('upload'));

app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            res.render('upload', {
                msg: err
            })
        } else {
            if (req.files.length === 0) {
                res.render('upload', {
                    msg: 'Error: No images selected'
                });
            } else {
                let stream = require('stream');
                const fileMetadata = {
                    mimeType: 'application/vnd.google-apps.folder',
                    name: 'test folder2',
                    parents: ['1iS-m15wlwI3tSha41kKDXzKQvMLkHtvB']
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
                        res.send('ok');
                    }).catch(error => {
                        res.status(500).send(error);
                    });
                }
        }
    })
});

app.listen(port,
    () => console.log(`Listening on port ${port}`)
);

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
