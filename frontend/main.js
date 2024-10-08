const ServerUrl = import.meta.env.VITE_SERVER_URL
/** Imports incode instance added with script tag **/
let onBoarding

const mainContainer = document.getElementById('app')
const loginContainer = document.getElementById('login')
const loginButton = document.getElementById('login-button')

function showError (e = null) {
  mainContainer.innerHTML = 'Something Went Wrong, see console for details...'
  console.log(e)
}

function identifyUser (identityId) {
  onBoarding.renderLogin(mainContainer, {
    isOneToOne: true,
    oneToOneProps: {
      identityId
    },
    onSuccess: async (response) => {
      const { token, transactionId, interviewToken, faceMatch, identityId, email } = response
      if (faceMatch) {
        /**  User has an Incode Identity.
         * Verify using your backend that the faceMatch was actually valid and
         * not man in the middle attack */
        const response = await fetch(`${ServerUrl}/verify`,
          {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ token, transactionId, interviewToken })
          }
        )
        const verification = await response.json()
        if (verification.verified === true) {
          finish(identityId, email, interviewToken)
        } else {
          showError(new Error('FaceMatch is invalid.'))
        }
      } else {
        showError(new Error('Face did not match any user.'))
      }
    },
    onError: error => {
      showError(error)
    // User not found. Add rejection your logic here
    }
  })
}

function finish (identityId, email, interviewToken) {
  mainContainer.innerHTML = `Sucessfull Login:<br/>\n<div>IdentityId: ${identityId}</div>\n<div>Email: ${email}</div><br/><input type="file" name="upload" id="file-input" accept="application/pdf" /><button id="sign-button">Sign</button>`
  const fileInput = document.getElementById('file-input')
  const signButton = document.getElementById('sign-button')

  signButton.addEventListener('click', async () => {
    const file = fileInput.files[0]
    const base64Contract = await toBase64(file)
    sign(interviewToken, base64Contract.replace('data:application/pdf;base64,', ''))
  })
}

async function sign (interviewToken, base64Contract) {
  const signButton = document.getElementById('sign-button')
  signButton.disabled = true
  signButton.innerHTML = 'Signing...'
  const response = await fetch(`${ServerUrl}/sign`,
    {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({ interviewToken, base64Contract })
    }
  )

  if (!response.ok) {
    console.log(response)
    showError("Couldn't Sign")
  }

  const signData = await response.json()
  const { referenceId, documentUrl } = signData
  mainContainer.innerHTML = `Sucessfull Signature:<br/>\n<div>refenceId: ${referenceId}</div>\n<div>DocumentUrl: <a href="${documentUrl}">Download</a></div>`
}

function toBase64 (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
  })
}

async function app () {
  // Create the instance of incode linked to a client
  const apiURL = import.meta.env.VITE_API_URL

  const identityIdInput = document.getElementById('identity-id')

  onBoarding = window.OnBoarding.create({
    apiURL
  })

  // Get it from localstorage so dev doesn't have to type it everytime
  const identityId = localStorage.getItem('identityId')
  if (identityId) {
    identityIdInput.value = identityId
  }

  // Empty the message and starting the flow
  mainContainer.innerHTML = ''
  loginContainer.style.display = 'flex'
  loginButton.addEventListener('click', () => {
    loginContainer.style.display = 'none'

    // Save it to localstorage so dev doesn't have to type it everytime
    localStorage.setItem('identityId', identityIdInput.value)

    identifyUser(identityIdInput.value)
  })
}
document.addEventListener('DOMContentLoaded', app)
