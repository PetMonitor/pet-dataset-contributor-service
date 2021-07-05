const { google } = require('googleapis');
const fs = require('fs');

module.exports = {
    uploadFile: uploadFile
};

// const credentials = require('../credentials.json');
const credentials = getCredentials();

const scopes = [
    'https://www.googleapis.com/auth/drive'
];

const auth = new google.auth.JWT(
    credentials.client_email, null,
    credentials.private_key, scopes
);

const drive = google.drive({ version: "v3", auth });

function getCredentials() {
    let credentials = process.env.GOOGLE_DRIVE_API_CREDENTIALS;
    if (credentials) {
        try {
            return JSON.parse(credentials);
        } catch (e) {
            console.log("Couldn't load credentials for Google Drive API");
            return {};
        }
    }
    return {};
}

// drive.files.list({
//     // pageSize: 1,
//     // fields: '*',
// }, (err, res) => {
//     if (err) throw err;
//     const files = res.data.files;
//     if (files.length) {
//         files.map((file) => {
//             console.log(file);
//         });
//     } else {
//         console.log('No files found');
//     }
// });

/**
 * Describe with given media and metaData and upload it using google.drive.create method()
 */
function uploadFile(fileMetadata, media) {
    return drive.files.create({
        resource: fileMetadata,
        media: media
    });
}

function downloadFile() {
    const fileId = '1wdisPQt7t4UHWA6TUcSCTOP0ehGKSwPC';
    const dest = fs.createWriteStream('/tmp/photo.jpg');
    drive.files.get({
        fileId: fileId,
        alt: 'media'
    }, {responseType: 'stream'}).then(res => {
        res.data
            .on('end', function () {
                console.log('Done');
            })
            .on('error', function (err) {
                console.log('Error during download', err);
            })
            .pipe(dest);
    });
}
