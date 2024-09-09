import { fakeBackendAuth } from './fake_backend'

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
    onSuccess: async (response) => {
      const { token, transactionId, interviewToken, faceMatch, customerId, email } = response
      if (faceMatch) {
        // User has an Incode Identity.
        // Verify using your backend that the faceMatch was actually valid and
        // not man in the middle attack
        let verification = {}
        try {
          verification = await fakeBackendAuth(token, transactionId, interviewToken)
        } catch (e) {
          showError(e)
        }

        if (verification.verified === true) {
          finish(customerId, email)
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
    },
    isOneToOne: true,
    oneToOneProps: {
      identityId
    }
  })
}

function finish (customerId, email) {
  mainContainer.innerHTML = `Sucessfull Login:<br/>\n<div>CustomerId: ${customerId}</div>\n<div>Email: ${email}</div>`
}

async function app () {
  // Create the instance of incode linked to a client
  const apiURL = import.meta.env.VITE_API_URL
  onBoarding = window.OnBoarding.create({ apiURL })
  const identityIdInput = document.getElementById('identity-id')

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
