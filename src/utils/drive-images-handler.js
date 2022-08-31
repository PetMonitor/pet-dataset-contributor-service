const { google } = require('googleapis');
const fs = require('fs');

module.exports = {
    uploadFile: uploadFile,
    listFiles: listFiles
};

const credentials = getCredentials();

const scopes = [
    'https://www.googleapis.com/auth/drive'
];

const auth = new google.auth.JWT(
    credentials.client_email, null,
    credentials.private_key, scopes
);

const drive = google.drive({ version: "v3", auth });

/**
 * Retrieves the credentials required to operate using the Google Drive API.
 */
function getCredentials() {
    let credentials = process.env.GOOGLE_DRIVE_API_CREDENTIALS;
    if (credentials) {
        try {
            return JSON.parse(credentials);
        } catch (e) {
            console.log("Couldn't load credentials for Google Drive API");
            return {};
        }
    } else {
        return require('../../credentials.json')
    }
}

/**
 * Retrieves a set of files from Google Drive. Details about the files to get and filtering fields are provided through
 * the options JSON parameter.
 */
function listFiles(options) {
    return drive.files.list(options);
}

/**
 * Uploads a file to Google Drive. Details about the file or its location are provided in file metadata and media JSON
 * parameters.
 */
function uploadFile(fileMetadata, media) {
    return drive.files.create({
        resource: fileMetadata,
        media: media
    });
}
