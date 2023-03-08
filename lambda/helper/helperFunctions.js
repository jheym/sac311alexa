const axios = require("axios")

/** //TODO: Get this working on a lambda environment
 * This function gets an OAuth token for use with the Salesforce API.
 * It returns a new token and should be used in every request to the Salesforce API.
 * Be sure to have a valid .env file containing the following variables:
 * SF_AUTH_URL, SF_USERNAME, SF_PASSWORD, SF_CLIENT_ID, SF_CLIENT_SECRET
 * 
 * @returns OAuth bearer token
 */
async function getOAuthToken() {
  const res = await axios.post(process.env.SF_AUTH_URL, {
    grant_type: "password",
    username: process.env.SF_USERNAME,
    password: process.env.SF_PASSWORD,
    client_id: process.env.SF_CLIENT_ID,
    client_secret: process.env.SF_CLIENT_SECRET
  },
  {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'} // Important for password grant type
  });
  return res.data.access_token;
}

/**
 * This function should be able to make any query to the SF API. Just pass in
 * the SOQL query you want to use and it will return the data, provided you
 * formatted correctly.
 * @param {string} query 
 * @returns data from the query
 */
async function querySFDB(query) {
  const endpoint = `${process.env.SALESFORCE_URL}/query`
  const token = await getOAuthToken();
  
  const res = await axios.get(endpoint, { 
    params: { q: query }, 
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded' // This formats the query to be url encoded
    }});
  return res.data;
}


// Stores the asked question in a session attribute for yes and no intent handlers
function setQuestion(handlerInput, questionAsked) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.questionAsked = questionAsked;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

/** 
 * Function to clear slots of an intent after submitting ticket
 * Example call in Abandoned vehicle, after output statement is created, before it is returned.
 * call with: 
 * index.clearSlots(handlerInput, requestEnvelope.request.intent)
 */
function clearSlots(handlerInput, currentIntent) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  delete sessionAttributes[currentIntent.name];
}

/**
 * Gets the highest scoring address candidate from the ArcGIS world geocoder.
 * The returned address will be used to query the sac311gis API for more details.
 * TODO: Find out which return address we should be using from the response.
 * @param {string} address 
 * @returns {Promise<string|boolean>} Returns the address if found, otherwise false.
 */
async function getWorldAddressCandidate(address) {
  if (!address) {
    throw new Error('Address parameter is required.');
  }
   
  try {
    const response = await axios.get(process.env.WORLD_GEOCODER_URL, { 
      params: { 
        address: address,
        outFields: '*',
        f: 'pjson',
        maxLocations: 10
      }});
    const candidates = response.data.candidates;
    let chosenCandidate = null;
    for (let candidate of candidates) {
      if (candidate.score === 100) {
        chosenCandidate = candidate;
        break;
      }
      if (candidate.score >= 80 && (!chosenCandidate || candidate.score > chosenCandidate.score)) {
        chosenCandidate = candidate;
      }
    }
    //chosenCandidate = getInternalAddressCandidate(chosenCandidate);
    return chosenCandidate ? chosenCandidate : false;
  } catch (error) {
    console.error(`Failed to find suitable address. ResponseCode: ${error.response.status}, ResponseData: ${JSON.stringify(error.response.data)}`);
    throw new Error(`Failed to find suitable address. ${error.message}`);
  }
}

/**
 * Takes a candidate object from world gis to compare against sac311 gis
 * Returns a candidate object or false if no suitable candidate
 * Automatically accepts a candidate if score equal to 100
 * @param {object} potentialCandidate
 * @returns {Promise<string|boolean>} Returns the address if found, otherwise false.
*/
async function getInternalAddressCandidate(potentialCandidate) {
  if (!potentialCandidate) {
    throw new Error('No Candidate was found.');
  }
  
  try {
    const response = await axios.get(process.env.INTERNAL_GEOCODER_URL, {
      params: {
        Street: potentialCandidate.attributes.ShortLabel,
        City: potentialCandidate.attributes.City,
        ZIP: potentialCandidate.attributes.Postal,
        SingleLine: potentialCandidate.attributes.ShortLabel,
        outFields: '*',
        outSR: 4326,
        f: 'pjson'
      }
    });
    const candidates = response.data.candidates;
    let chosenCandidate = null;
    for (let candidate of candidates) {
      if (candidate.score === 100) {
        chosenCandidate = candidate;
        break;
      }
      if (candidate.score >= 85 && (!chosenCandidate || candidate.score > chosenCandidate.score)) {
        chosenCandidate = candidate;
      }
    }
    return chosenCandidate ? chosenCandidate : false;
  } catch (error) {
    console.error(`Failed to find suitable address. ResponseCode: ${error.response.status}, ResponseData: ${JSON.stringify(error.response.data)}`);
    throw new Error(`Failed to find suitable address. ${error.message}`);
  }
}

/**
 * This function takes a latitude and longitude and returns an address
 * //TODO: Addresses must not be POI, they must be full addresses. There is a way to specify this as a param.
 * @param {float} latitude 
 * @param {float} longitude 
 * @returns 
 */

//FIXME: Mico - Reverse geocode is giving apartment numbers. Let's try messing
//with the url params a bit more to see if we can get a better type of
//address.
async function reverseGeocode(latitude, longitude) {
  const url = `https://utility.arcgis.com/usrsvcs/servers/3f594920d25340bcb7108f137a28cda1/rest/services/World/GeocodeServer/reverseGeocode?location=${longitude},${latitude}&distance=500&f=json`;
  
  try {
    const response = await axios.get(url);
    console.log("Response:", response);
    const result = response.data;
    console.log("Result:", result);
    const address = result.address.Address || false; // Will this err is no address field?
    console.log("Address:", address);
    return address;
  } catch (error) {
    console.error(error);
    return false;
  }
}

module.exports = {
  getOAuthToken,
  querySFDB,
  setQuestion,
  clearSlots,
  getWorldAddressCandidate,
  getInternalAddressCandidate,
  reverseGeocode
}