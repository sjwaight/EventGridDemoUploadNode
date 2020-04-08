const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const uuid = require('uuid');
const url = require('url');

const maxFileSizeMB = 3

// datetime for blob storage container
const datetime = require('node-datetime');
var dt = datetime.create();

// Azure Blob Storage setup
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const { AbortController } = require("@azure/abort-controller");
const account = process.env.ACCOUNT_NAME || "";
const accountKey = process.env.ACCOUNT_KEY || "";
var containerName = "wishlist" + dt.format('Ymd');
const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(`https://${account}.blob.core.windows.net/`, sharedKeyCredential);

// Upload file from local web server to Azure Blob Storage, uniquely renaming file
async function uploadFileToBlobStorage(filePath, fileName) {

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
 
    // set the right content type for the uploaded image in blob storage
    var contentType = "image/png";
    if(fileName.endsWith('jpg')) {
        contentType = "image/jpeg";
    }

    await blockBlobClient.uploadStream(fs.createReadStream(filePath), 4 * 1024 * 1024, 20, {
        abortSignal: AbortController.timeout(30 * 60 * 1000), blobHTTPHeaders: { blobContentType: contentType }
      });
}

// Create HTTP server entrypoint
const server = http.createServer();

server.on('request', async (request, response) => {

    response.writeHead(200, {'Content-Type': 'text/html'});
    response.write('<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css">')

    if (request.url && request.url.startsWith('/viewresult'))
    {
        var params = url.parse(request.url, true).query;
        var fileName = params['file'];
        var fileExtension = fileName.substring(fileName.lastIndexOf('.'));
        var fileWithoutExtension = fileName.substring(0,fileName.lastIndexOf('.'));
        var thumbnailFileName = fileWithoutExtension + "_thumb" + fileExtension;

        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        // Read the metadata for the image which is where the description is written
        // by the Azure Logic App after calling Cognitive Services Computer Vision API
        var props = await blockBlobClient.getProperties();
        var imageDescription = props.metadata['description'];

        if(imageDescription == undefined) {
            imageDescription = "Click refresh to view!";
        }

        response.write('<div class="container"><h1>Results for Upload</h1>');
        response.write("<h2>Computer Vision Auto Caption</h2>");
        response.write(`<p>${imageDescription}</p>`);
        response.write("<h2>Original Image</h2>");
        response.write(`<p><img src="https://${account}.blob.core.windows.net/${containerName}/${fileName}"></p>`);
        response.write("<h2>Thumbnail</h2>");
        response.write(`<p><img src="https://${account}.blob.core.windows.net/${containerName}/${thumbnailFileName}"></p>`);
        response.write(`<p><a href="/">Upload another file</a></p></div>`);
        return response.end();
    }

    if (request.url == '/fileupload') {

        var formOptions = { keepExtensions: true, maxFileSize: maxFileSizeMB * 1024 * 1024};
        var form = new formidable.IncomingForm(formOptions);

        form.parse(request, function(err, fields, files) {});

        form.on('end', function(fields, files) {
            var uploadedPath = this.openedFiles[0].path;
            var newFileName = uuid.v1() + "_" + this.openedFiles[0].name;
            console.log(newFileName);
            uploadFileToBlobStorage(uploadedPath, newFileName);
            response.write(`<div class="container"><h1>File uploaded!</h1><p><a href="viewresults?file=${newFileName}">View Results!</a></p></div>`);
            response.end(); 

        });

        form.on('error', function(err) {
            console.error(err);
        });

      } else {
        response.write('<div class="container"><h1>Azure Event Grid Serverless Demo</h1>')
        response.write('<p>Select a JPEG or PNG to upload to see how we can use Azure Event Grid to tie together serverless solutions.</p>');
        response.write(`<p>Maximum file size: ${maxFileSizeMB}MB.</p>`); 
        response.write('<form action="fileupload" method="post" enctype="multipart/form-data">');
        response.write('<div class="form-group"><label for="samplefile">Select File:</label><input type="file" name="samplefile" accept=".jpg,.png" class="form-control"></div>');
        response.write('<input type="submit" class="btn btn-default">');
        response.write('</form></div>');
        return response.end();
      }
});

const port = process.env.PORT || 1337;
server.listen(port);