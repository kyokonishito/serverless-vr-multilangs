var Cloudant = require('@cloudant/cloudant');
var fs = require('fs');
var cloudant;
var dbName;
var dbNameProcessed;
const lang = ["en", "ar", "de", "es", "fr", "it", "ja", "ko","pt-br", "zh-cn", "zh-tw"];

function main(params) {
    cloudant = Cloudant({account:params.USERNAME, password:params.PASSWORD});
    dbName = params.DBNAME;
    dbNameProcessed = params.DBNAME_PROCESSED;
    return new Promise(function(resolve, reject) {
        let mydb = cloudant.db.use(dbName);
        mydb.attachment.get(params.id, 'image', function(err, data) {
            if (err) {
                reject(err);
            } else {
                console.log(params)
                console.log(data)
                resolve(processImageToWatson(data,params.id,params.WATSON_VR_APIKEY));
            }
        });
    });
}

async function processImageToWatson(data,id,apikey) {
    let VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
    var visualRecognition = new VisualRecognitionV3({
        version: '2018-03-19',
        iam_apikey: apikey,
    });

    var watsonResult = {};
    var result = null;

    for (var i = 0; i < lang.length; i++){
        result = await classifyImage(data, id, lang[i],visualRecognition)
        .catch(function(err) {
            return err;
          });
        watsonResult[lang[i]]= result.images[0].classifiers;    
    }

    result = await updateDocument(watsonResult,id)
    .catch(function(err) {
        return err;
    });
    return result; 
}

function updateDocument(watsonResult,id) {
    return new Promise(function(resolve, reject) {
        let mydb = cloudant.db.use(dbNameProcessed);
        var doc = {};
        doc._id = id
        //doc.watsonResults = watsonResult.images[0].classifiers;
        doc.watsonResults = watsonResult;　//added
        mydb.insert(doc, function(err,body) {
            if (err) {
                reject(err);
            } else {
                console.log(body);
                resolve(body);
            }
        });
    });
}

function classifyImage(data, id, lang, visualRecognition){
    return new Promise(function(resolve, reject) {
        let filename = __dirname + '/' + id;
        fs.writeFileSync(filename, data)

        var watsonvrparams = {
            images_file: fs.createReadStream(filename)
            ,accept_language: lang
        };

        visualRecognition.classify(watsonvrparams, function(err, res) {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(res)
            }
        });
    });
}
