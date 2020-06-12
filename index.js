const http = require('http');
const formidable = require('formidable');
const fs = require('fs');
const uuid = require('uuid');
const url = require('url');
const appInsights = require('applicationinsights');

const maxFileSizeMB = 3

// datetime for blob storage container
var datetime = require('node-datetime');

// Azure Blob Storage setup
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const { AbortController } = require("@azure/abort-controller");
const account = process.env.ACCOUNT_NAME || "";
const accountKey = process.env.ACCOUNT_KEY || "";

const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(`https://${account}.blob.core.windows.net/`, sharedKeyCredential);

// Application Insights setup
const appInsightsKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY || "";
appInsights.setup(appInsightsKey).start();

const htmlHeader = `<html><head><title>Azure Event Grid Serverless Demo</title>
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css">
<script type="text/javascript">
!function(T,l,y){var S=T.location,u="script",k="instrumentationKey",D="ingestionendpoint",C="disableExceptionTracking",E="ai.device.",I="toLowerCase",b="crossOrigin",w="POST",e="appInsightsSDK",t=y.name||"appInsights";(y.name||T[e])&&(T[e]=t);var n=T[t]||function(d){var g=!1,f=!1,m={initialize:!0,queue:[],sv:"4",version:2,config:d};function v(e,t){var n={},a="Browser";return n[E+"id"]=a[I](),n[E+"type"]=a,n["ai.operation.name"]=S&&S.pathname||"_unknown_",n["ai.internal.sdkVersion"]="javascript:snippet_"+(m.sv||m.version),{time:function(){var e=new Date;function t(e){var t=""+e;return 1===t.length&&(t="0"+t),t}return e.getUTCFullYear()+"-"+t(1+e.getUTCMonth())+"-"+t(e.getUTCDate())+"T"+t(e.getUTCHours())+":"+t(e.getUTCMinutes())+":"+t(e.getUTCSeconds())+"."+((e.getUTCMilliseconds()/1e3).toFixed(3)+"").slice(2,5)+"Z"}(),iKey:e,name:"Microsoft.ApplicationInsights."+e.replace(/-/g,"")+"."+t,sampleRate:100,tags:n,data:{baseData:{ver:2}}}}var h=d.url||y.src;if(h){function a(e){var t,n,a,i,r,o,s,c,p,l,u;g=!0,m.queue=[],f||(f=!0,t=h,s=function(){var e={},t=d.connectionString;if(t)for(var n=t.split(";"),a=0;a<n.length;a++){var i=n[a].split("=");2===i.length&&(e[i[0][I]()]=i[1])}if(!e[D]){var r=e.endpointsuffix,o=r?e.location:null;e[D]="https://"+(o?o+".":"")+"dc."+(r||"services.visualstudio.com")}return e}(),c=s[k]||d[k]||"",p=s[D],l=p?p+"/v2/track":config.endpointUrl,(u=[]).push((n="SDK LOAD Failure: Failed to load Application Insights SDK script (See stack for details)",a=t,i=l,(o=(r=v(c,"Exception")).data).baseType="ExceptionData",o.baseData.exceptions=[{typeName:"SDKLoadFailed",message:n.replace(/\./g,"-"),hasFullStack:!1,stack:n+"\nSnippet failed to load ["+a+"] -- Telemetry is disabled\nHelp Link: https://go.microsoft.com/fwlink/?linkid=2128109\nHost: "+(S&&S.pathname||"_unknown_")+"\nEndpoint: "+i,parsedStack:[]}],r)),u.push(function(e,t,n,a){var i=v(c,"Message"),r=i.data;r.baseType="MessageData";var o=r.baseData;return o.message='AI (Internal): 99 message:"'+("SDK LOAD Failure: Failed to load Application Insights SDK script (See stack for details) ("+n+")").replace(/\"/g,"")+'"',o.properties={endpoint:a},i}(0,0,t,l)),function(e,t){if(JSON){var n=T.fetch;if(n&&!y.useXhr)n(t,{method:w,body:JSON.stringify(e),mode:"cors"});else if(XMLHttpRequest){var a=new XMLHttpRequest;a.open(w,t),a.setRequestHeader("Content-type","application/json"),a.send(JSON.stringify(e))}}}(u,l))}function i(e,t){f||setTimeout(function(){!t&&m.core||a()},500)}var e=function(){var n=l.createElement(u);n.src=h;var e=y[b];return!e&&""!==e||"undefined"==n[b]||(n[b]=e),n.onload=i,n.onerror=a,n.onreadystatechange=function(e,t){"loaded"!==n.readyState&&"complete"!==n.readyState||i(0,t)},n}();y.ld<0?l.getElementsByTagName("head")[0].appendChild(e):setTimeout(function(){l.getElementsByTagName(u)[0].parentNode.appendChild(e)},y.ld||0)}try{m.cookie=l.cookie}catch(p){}function t(e){for(;e.length;)!function(t){m[t]=function(){var e=arguments;g||m.queue.push(function(){m[t].apply(m,e)})}}(e.pop())}var n="track",r="TrackPage",o="TrackEvent";t([n+"Event",n+"PageView",n+"Exception",n+"Trace",n+"DependencyData",n+"Metric",n+"PageViewPerformance","start"+r,"stop"+r,"start"+o,"stop"+o,"addTelemetryInitializer","setAuthenticatedUserContext","clearAuthenticatedUserContext","flush"]),m.SeverityLevel={Verbose:0,Information:1,Warning:2,Error:3,Critical:4};var s=(d.extensionConfig||{}).ApplicationInsightsAnalytics||{};if(!0!==d[C]&&!0!==s[C]){method="onerror",t(["_"+method]);var c=T[method];T[method]=function(e,t,n,a,i){var r=c&&c(e,t,n,a,i);return!0!==r&&m["_"+method]({message:e,url:t,lineNumber:n,columnNumber:a,error:i}),r},d.autoExceptionInstrumented=!0}return m}(y.cfg);(T[t]=n).queue&&0===n.queue.length&&n.trackPageView({})}(window,document,{
src: "https://az416426.vo.msecnd.net/scripts/b/ai.2.min.js", 
cfg: {
    instrumentationKey: "${appInsightsKey}"
}});
</script>
</head>
<body>`;

// Upload file from local web server to Azure Blob Storage, uniquely renaming file
async function uploadFileToBlobStorage(filePath, fileName, containerName) {

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
 
    var continerExists = await containerClient.exists();

    // if the target container hasn't yet been created let's create it
    // and set anonymous access policy on blobs only.
    if(!continerExists) {
        await containerClient.create();
        await containerClient.setAccessPolicy('blob');
    }

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
    response.write(htmlHeader);

    var dt = datetime.create();
    var containerName = "wishlist" + dt.format('Ymd');

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
        response.write(`<p><a href="/">Upload another file</a></p>`);
        response.write("<h2>Computer Vision Auto Caption</h2>");
        response.write(`<p>${imageDescription}</p>`);
        response.write("<h2>Thumbnail (200x200)</h2>");
        response.write(`<p><img src="https://${account}.blob.core.windows.net/${containerName}/${thumbnailFileName}"></p>`);
        response.write("<h2>Original Image</h2>");
        response.write(`<p><img src="https://${account}.blob.core.windows.net/${containerName}/${fileName}"></p>`);
        response.write(`<p><a href="/">Upload another file</a></p></div></body></html>`);
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
            uploadFileToBlobStorage(uploadedPath, newFileName, containerName);
            response.write(`<div class="container"><h1>File uploaded!</h1><p><a href="viewresults?file=${newFileName}">View Results!</a></p></div></body></html>`);
            response.end(); 
        });

        form.on('error', function(err) {
            console.error(err);
            response.write(`<div class="container"><h1>Error Occurred!</h1><p>Please check that you uploaded a file smaller than the size limit listed on the upload page.</p><p>Click back to try again.</p></div></body></html>`);
            response.end(); 
        });

      } else {
        response.write('<div class="container"><h1>Azure Event Grid Serverless Demo</h1>');
        response.write('<p>View source on <a href="https://github.com/sjwaight/EventGridDemoUploadNode" target="_blank">GitHub</a>.</p>');
        response.write('<p>Select a JPEG or PNG to upload to see how we can use Azure Event Grid to tie together serverless solutions.</p>');
        response.write(`<p>Maximum file size: ${maxFileSizeMB}MB.</p>`); 
        response.write('<form action="fileupload" method="post" enctype="multipart/form-data">');
        response.write('<div class="form-group"><label for="samplefile">Select File:</label><input type="file" name="samplefile" accept=".jpg,.png" class="form-control"></div>');
        response.write('<input type="submit" class="btn btn-default">');
        response.write('</form></div></body></html>');
        return response.end();
      }
});

const port = process.env.PORT || 1337;
server.listen(port);