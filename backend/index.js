const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('node:fs');

const app = express();
dotenv.config();

app.use(cors())
// Middleware to handle raw body data
app.use(express.raw({ type: '*/*' }));

const defaultHeader = {
  'Content-Type': "application/json",
  'x-api-key': process.env.API_KEY,
  'api-version': '1.0'
};

// Admin Token + ApiKey are needed for approving
const adminHeader = {
  'Content-Type': "application/json",
  'x-api-key': process.env.API_KEY,
  'X-Incode-Hardware-Id': process.env.ADMIN_TOKEN,
  'api-version': '1.0'
};

// Receives the information about a faceMatch attempt and verifies
// if it was correct and has not been tampered.
app.post('/verify', async (req, res) => {
  let response={};
  try{
    /** Get parameters from body */
    const faceMatchData = JSON.parse(req.body.toString());
    const {transactionId, token, interviewToken} = faceMatchData;
    const verificationParams = { transactionId, token, interviewToken };
    
    const verifyAttemptUrl = `${process.env.API_URL}/omni/authentication/verify`;
    response = await doPost(verifyAttemptUrl, verificationParams, adminHeader);
  } catch(e) {
    console.log(e.message);
    res.status(500).send({success:false, error: e.message});
    return;
  }
  log = {
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    data: {verificationParams, response}
  }
  res.status(200).send(response);
  
  // Write to a log so you can debug it.
  console.log(log);
});

// if it was correct and has not been tampered.
app.post('/sign', async (req, res) => {
  /** Receive contract and token as parameters */
  const signParamsData = JSON.parse(req.body.toString());
  const { interviewToken, base64Contract } = signParamsData;
  
  /** Prepare the authorization header that will be used in calls to incode */
  sessionHeader = {...defaultHeader};
  sessionHeader['X-Incode-Hardware-Id'] = interviewToken;
  
  let response = {};
  try{
    /** Get URL where to upload the contract */
    const generateDocumentUploadUrl = `${process.env.API_URL}/omni/es/generateDocumentUploadUrl`;
    const documentURLData = await doPost(generateDocumentUploadUrl, { token:interviewToken }, sessionHeader);
    const {referenceId, preSignedUrl} = documentURLData
    
    /** Upload contract to AWS presigned url */
    const binary = Buffer.from(base64Contract, 'base64');
    const uploadResponse =  await fetch(preSignedUrl, {
      method: "PUT",
      headers: {"Content-Type": "application/pdf"},
      body: binary,
    })
    if (!uploadResponse.ok) {
      throw new Error('Uploading contract failed with code ' + uploadResponse.status)
    }
    
    /** Sign the document */
    const signURL = `${process.env.API_URL}/omni/es/process/sign`;
    const signData = await doPost(signURL,
      {
        "documentRef": referenceId,
        "userConsented": true
      },
      sessionHeader
    );
    const {success} = signData
    if (!success) { throw new Error('Sign failed');}
    
    /** Fetch all signed document references */
    const documentsSignedURL = `${process.env.API_URL}/omni/es/documents/signed`;
    const documentsSignedData = await doGet(documentsSignedURL, {}, sessionHeader);
    const {documents} = documentsSignedData
    
    /** This endpoint returns all documents, find the one just signed  matching by referenceId*/
    const justSigned = documents.find(document => document.documentRef=== referenceId)
    
    /** Return referenceId and documentUrl */
    const {documentRef, documentUrl} = justSigned
    response = {referenceId, documentUrl}
  
  } catch(e) {
    console.log(e.message);
    res.status(500).send({success:false, error: e.message});
    return;
  }
  log = {
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    data: {signParamsData, response}
  }
  res.status(200).send(response);
  // Write to a log so you can debug it.
  console.log(log);
});


app.get('*', function(req, res){
  res.status(404).json({error: `Cannot GET ${req.url}`});
});

app.post('*', function(req, res){
  res.status(404).json({error: `Cannot POST ${req.url}`});
});

// Utility functions
const doPost = async (url, bodyparams, headers) => {
  try {
    const response = await fetch(url, { method: 'POST', body: JSON.stringify(bodyparams), headers});
    if (!response.ok) {
     //console.log(response.json());
      throw new Error('Request failed with code ' + response.status)
    }
    return response.json();
  } catch(e) {
    console.log({url, bodyparams, headers})
    throw new Error('HTTP Post Error: ' + e.message)
  }
}

const doGet = async (url, params, headers) => {
  try {
    const response = await fetch(`${url}?` + new URLSearchParams(params), {method: 'GET', headers});
    if (!response.ok) {
      //console.log(await response.json());
      throw new Error('Request failed with code ' + response.status)
    }
    return response.json();
  } catch(e) {
    console.log({url, params, headers})
    throw new Error('HTTP Get Error: ' + e.message)
  }
}


// Listen for HTTP
const httpPort = 3000;

app.listen(httpPort, () => {
  console.log(`HTTP listening on: http://localhost:${httpPort}/`);
});

module.exports = app;
