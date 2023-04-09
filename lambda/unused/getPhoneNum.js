const Alexa = require('ask-sdk-core');


/* 
Use the Alexa API to look up the caller’s phone number in their contact details. This should happen automatically at the beginning of the call. Store the phone number in a session attribute called phone. If the caller does not have a phone number set or if they have not given the skill permission to do so, create the phone session attribute and set its value to null. (That will be used later to determine if we are submitting an anonymous call or not).

Acceptance Criteria

Function should take handlerInput as a parameter and create a new session attribute for storing the phone number. The function should also return the phone number as an optional functionality. If needed, normalize the phone number to be in the following format 9165551234, removing any extra digits.

*/


// Helper function to retrieve the user's phone number and save it in session attribute called phone else return null but do not throw an error
async function getPhoneNumber(handlerInput) {
  const { permissions } = handlerInput.requestEnvelope.context.System.user;
  if (!permissions || !permissions.consentToken) {
    return null;
  }

 
  const serviceClientFactory = handlerInput.serviceClientFactory;
  const upsServiceClient = serviceClientFactory.getUpsServiceClient();
  try {
    //add phone into session attributes
    const profile = await upsServiceClient.getProfileMobileNumber();
    handlerInput.attributesManager.setSessionAttributes({ phone: profile.phoneNumber });
    return PhoneNumberFormat(profile.phoneNumber);
  } catch (error) {
    if (error.name !== 'ServiceError') {
      const message = `There was a problem calling the Device Address API. ${error.message}`;
      console.log(message);
      throw error;
    }
    if (error.statusCode === 403) {
      console.log('The user has not granted permissions to access their phone.');
   
    } else {
      const message = `There was a problem calling the Device Address API. ${error.message}`;
      console.log(message);
      throw error;
    }
  }
  return null;
}
//A function that retrieve the last 9 digits and remove spaces of the phone number
function PhoneNumberFormat(phoneNum) {
  let phone = phoneNum.replace(/\s/g, '');
  if (phone.length > 9) {
    phone = phone.substring(phone.length - 10);
  
  }
  return phone;
}

PhoneNumberFormat('+1231212312312 32129165551 234')




module.exports = {
  getPhoneNumber,
};
