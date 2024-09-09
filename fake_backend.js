const apiurl = import.meta.env.VITE_FAKE_BACKEND_APIURL
const apikey = import.meta.env.VITE_FAKE_BACKEND_APIKEY

const defaultHeader = {
  'Content-Type': 'application/json',
  'x-api-key': apikey,
  'api-version': '1.0'
}

// Call Incode's `omni/start` API to create an Incode session which will include a
// token in the response.
const fakeBackendStart = async function () {
  const url = `${apiurl}/omni/start`
  const params = {
    configurationId: flowid
    // language: "en-US",
    // redirectionUrl: "https://example.com?custom_parameter=some+value",
    // externalCustomerId: "the id of the customer in your system",
  }

  let response
  try {
    response = await fetch(url, { method: 'POST', body: JSON.stringify(params), headers: defaultHeader })
    if (!response.ok) {
      throw new Error('Request failed with code ' + response.status)
    }
  } catch (e) {
    throw new Error('HTTP Post Error: ' + e.message)
  }

  // The session response has many values, but you should only pass the token to the frontend.
  const { token } = await response.json()
  return { token }
}

// Finishes the session started at /start
const fakeBackendFinish = async function (token) {
  const url = `${apiurl}/omni/finish-status`

  const sessionHeaders = { ...defaultHeader }
  sessionHeaders['X-Incode-Hardware-Id'] = token

  let response
  try {
    response = await fetch(url, { method: 'GET', headers: sessionHeaders })
    if (!response.ok) {
      throw new Error('Request failed with code ' + response.status)
    }
  } catch (e) {
    throw new Error('HTTP Post Error: ' + e.message)
  }
  const { redirectionUrl, action } = await response.json()
  return { redirectionUrl, action }
}

export { fakeBackendStart, fakeBackendFinish }
