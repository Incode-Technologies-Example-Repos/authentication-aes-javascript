# Face Authentication + Signature Sample

This sample follows the next steps to go trough the Face Authentication
and then signing of a contract.

```mermaid
sequenceDiagram
    participant w as Frontend
    participant b as Backend
    participant a as API

    note over w: (Ask for identityId)
    
    note over w: incode.create()
    note over w: renderLogin()<br>{ isOneToOne:true, identityId }
    alt faceMatch==false
        note over w: User doesn't exists
    else
        w -->> b: token<br>transactionId<br>interviewToken
        note over b: myapp.com/api/verify
        note over b: get adminToken
        b-->> a: {token, transactionId,interviewToken,header:adminToken}
        note over a: /omni/authentication/verify
        a-->>b: verified
        b-->>w: verified
        alt verified!=true
            note over w: Authentication is not valid
        else
            note over w: Authentication Verified
            note over w: (Ask for Contract)
            w -->> b: interviewToken<br>contract:base64
            note over b: myapp.com/api/sign
            note over b: Convert contract to binary
            
            b -->>a: {header:interviewToken}
            note over a: /omni/es/generateDocumentUploadUrl
            a -->>b: {referenceId, preSignedUrl}
            
            b -->>a: {contract in binary}
            note over a: preSignedUrl
            a -->>b: {httpstatus:200}

            b -->>a: {documentRef:referenceId, userConsented:true, header:interviewToken}
            note over a: /omni/es/process/sign
            a -->>b: {success:true}
            
            b -->>a: {header:interviewToken}
            note over a: /omni/es/documents/signed
            a -->>b: [list of signed documents]
            note over b: Extract signed documentUrl
            b -->> w: {referenceId, documentUrl}
            note over w: Show Document Download<br> Link valid for 15 mins
        end
    end
```

## Install
This project has two subfolders, one for `frontend` and one for `backend`.

to install them  do `npm install`in both folders.

## Configure
Inside both folder you will find a `.env.example` file, copy it as `.env` and
fill the relevant variables inside it.

## Running
You need to run both the backend and the frontend at the same time.

Frontend
```
npm run dev
```

Backend
```
npm run nodemon
```

Your computer will then present a webpage in `https://your-local-ip:5731/` where
you can authenticate and sign, a `small-sample-contract.pdf` is included with the
project for that.

A fake backend is included it's locally exposed in `http://localhost:3000/`and
reverse proxyed into `https://your-local-ip:5731/api` for CORS compatibility.

## Admin Token
For the verify actio nyou need an Admin Token, that get via an executive user-password
and have a 24 hour expiration, thus need a more involved strategy to be generated,
renewed, securely saved and shared to the app.

For this simple test just use the following cURl, and add save the generated token to
the `backend/.env` file, you will need to refresh it after 24 hours.

```bash
curl --location 'https://demo-api.incodesmile.com/executive/log-in' \
--header 'Content-Type: application/json' \
--header 'api-version: 1.0' \
--header 'x-api-key: <your-apikey>' \
--data '{
    "email": "••••••",
    "password": "••••••"
}'
```

## Important

The URL for the API Url is different in frontend than in backend, frontend uses
the `0/` at the end.

## Dependencies

* **nodejs18+**: JavaScript runtime built on Chrome's V8 JavaScript engine.
* **express**: Web server framework.
* **dotenv**: Used to access environment variables.