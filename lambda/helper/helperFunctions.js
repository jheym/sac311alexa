const axios = require("axios")
const Alexa = require("ask-sdk")

// Stores the asked question in a session attribute for yes and no intent handlers
function setQuestion(handlerInput, questionAsked) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.questionAsked = questionAsked;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
}

/*
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
async function getAddressCandidate(address) {
    if (!address) {
      throw new Error('Address parameter is required.');
    }
  
    const url = `https://utility.arcgis.com/usrsvcs/servers/3f594920d25340bcb7108f137a28cda1/rest/services/World/GeocodeServer/findAddressCandidates?&address=${address}&outFields=*&f=pjson&maxLocations=10`;
  
    try {
      const response = await axios.get(url);
      const candidates = response.data.candidates;
      let chosenCandidate = null;
      for (const candidate of candidates) {
        if (candidate.score > 80 && (!chosenCandidate || candidate.score > chosenCandidate.score)) {
          chosenCandidate = candidate;
        }
      }
      return chosenCandidate ? chosenCandidate.address : false;
    } catch (error) {
      console.error(`Failed to find the address. ResponseCode: ${error.response.status}, ResponseData: ${JSON.stringify(error.response.data)}`);
      throw new Error(`Failed to find the address. ${error.message}`);
    }
  }
  /**
   * This function takes a latitude and longitude and returns an address
   * //TODO: Addresses must not be POI, they must be full addresses. There is a way to specify this as a param.
   * @param {float} latitude 
   * @param {float} longitude 
   * @returns 
   */
  async function reverseGeocode(latitude, longitude) {
    const url = `https://utility.arcgis.com/usrsvcs/servers/3f594920d25340bcb7108f137a28cda1/rest/services/World/GeocodeServer/reverseGeocode?location=${longitude},${latitude}&distance=500&f=json`;
  
    try {
      const response = await axios.get(url);
      console.log("Response:", response);
      const result = response.data;
      console.log("Result:", result);
      const address = result?.address?.Match_addr || false;
      console.log("Address:", address);
      return address;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

module.exports = {
  setQuestion,
  clearSlots,
  getAddressCandidate,
  reverseGeocode
}
