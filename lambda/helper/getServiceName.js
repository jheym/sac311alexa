const helper = require("./helperFunctions.js")


// The purpose of this function is to prepare a data structure that will be used by any intent handler just before creating a case in Salesforce.

// Create a function that takes a handlerinput and uses the current intent's name to look up the service type name it is mapped to in the MapServiceName table.
/**
 * 
 * 
 * Returns the service type name mapped to by the current intent name.

 */
function getServiceDetail(handlerInput) {
  // Get the current intent name from the handlerInput object
  const intentName = handlerInput.requestEnvelope.request.intent.name;
 //const intentName = "AbandonedVehicleIntent"
  const serviceTypeData = { 
    'AbandonedVehicleIntent': {    
      'sfdbSubServiceType': 'Vehicle On Street',
      'sfdbSubServiceId': 'a0Om0000005iKxlEAE',
      'ParentServiceName': 'Code Enforcement',
      'ParentServiceId': 'a0Om0000003eSnmEAE'
    },
    'HomelessCampIntentHandler': {
      'sfdbSubServiceType': 'Trash',
      'sfdbSubServiceId': 'a0Om0000005oGQLEA2',
      'ParentServiceName': 'Homeless Camp',
      'ParentServiceId': 'a0Om0000003eSnmEAE'
    },
    // Will add more intents and mappings as needed
  };
  // Look up the corresponding object in the serviceTypeData object using the intentName as the key
  if (serviceTypeData[intentName]) {
    // If a matching object is found, return its sfdbSubServiceType property
    const ServiceTypeName = serviceTypeData[intentName];
    return JSON.stringify(ServiceTypeName);
  } else {
    // If no matching object is found, return null or a default message
    return null || 'No Service Type Name Found';
  }


}


module.exports = {getServiceDetail};