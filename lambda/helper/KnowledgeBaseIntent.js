const Alexa = require("ask-sdk-core")


//Started
const StartedKBTrashCanIntent = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "KBTrashCanIntent"
    );
  },
   handle(handlerInput) {
    const { responseBuilder } = handlerInput;

    const speechOutput =
      "For a change of container size, property owners can request a change in the garbage or recycle container size at any time. One exchange in a six month period is allowed, free of charge." +
      "\nAn additional fee will be applied to the account for additional exchanges within the six month period. Requests for a change in the size of garbage or recycle cans, regardless of whether it"+
       "\n increases or decreases the monthly bill, must be made by the property owner. We're unable to process this request if you are the tenant, even if you are listed on the account.";
    return responseBuilder.speak(speechOutput).getResponse();
  },
};

const StartedKBJunkPickUpIntent = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "KBJunkPickUpIntent"
    );
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput;

    const speechOutput =
      "Okay, The City provides two free appointments per calendar year for the removal of acceptable household junk, including yard waste." +
      "\nThe Household Junk Pickup program runs from February through the end of October. Appointments will always be scheduled the day before your normal garbage collection day. Residents can start contacting 3 1 1 to schedule an appointment starting at the end of January." +
      "\nAppointments usually fill up by the middle of September so it is suggested to schedule as soon as you can. Unused appointments do not roll over into the next calendar year.";

    return responseBuilder.speak(speechOutput).getResponse();
  },
};

const StartedKBPayJunkPickup = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "KBPayJunkPickUp"
    );
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput;

    const speechOutput =
      "If you have used your free junk pickups, you may schedule a paid bulky waste pickup. Bulky waste pickups are scheduled only on a property's regular service day. The fee for a paid pickup is $36.41. " +
      "\nTo schedule a bulky waste pickup, please contact the Sacramento City Utility Billing Office at 9 1 6 8 0 8 5 4 5 4 and select option two. Billing Office hours are: Monday through Thursday, 8 AM to 4 PM and Friday, 8 AM to 11:30 AM.";

    return responseBuilder.speak(speechOutput).getResponse();
  },
};

const StartedKBReplacementContainer = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "KBReplacementContainer"
    );
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput;

    const speechOutput =
      "The City will replace a missing container free of charge. Property owners may order additional containers  at the following rates: " +
      "\n\nAdditional Garbage container, monthly" +
      "\nfor 96 Gallon - $24.77" +
      "\nfor 64 Gallon - $20.98" +
      "\nfor 32 Gallon - $18.11" +
      "\n\nFor Additional Recycle container, monthly" +
      "\n$2.68 regardless of size" +
      "\n\nAdditional Organics container, monthly" +
      "\nfor 90 Gallon- $5.44"+
      "\nFor more spcific information for your inquiries, please visit the City of Sacramento website at www.cityofsacramento.org or call 3 1 1 or at 9 1 6 8 0 8 5 0 1 1. ";
    return responseBuilder.speak(speechOutput).getResponse();
  },
};

  
  module.exports = {StartedKBTrashCanIntent, StartedKBJunkPickUpIntent, StartedKBPayJunkPickup, StartedKBReplacementContainer}
      