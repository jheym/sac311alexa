const Alexa = require("ask-sdk-core")

// TODO: Add description of this module's purpose

const StartedKBTrashCanIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "KBTrashCanIntent"
    );
  },
   handle(handlerInput) {
    const { responseBuilder } = handlerInput;

    const speechOutput =
      "For a change of container size, property owners can request a change in the garbage or recycle container size at any time. One exchange in a six month period is allowed, free of charge. \
      An additional fee will be applied to the account for additional exchanges within the six month period. Requests for a change in the size of garbage or recycle cans, regardless of whether it \
      increases or decreases the monthly bill, must be made by the property owner. We're unable to process this request if you are the tenant, even if you are listed on the account."; 
    return responseBuilder.speak(speechOutput).getResponse();
  },
};

const StartedKBJunkPickUpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "KBJunkPickUpIntent"
    );
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput;

    const speechOutput =
      "The City provides two free appointments per calendar year for the removal of acceptable household junk, including yard waste. \
      The Household Junk Pickup program runs from February through the end of October. Appointments will always be scheduled the day before your normal garbage collection day. Residents can start contacting 3 1 1 to schedule an appointment starting at the end of January. \
      Appointments usually fill up by the middle of September so it is suggested to schedule as soon as you can. Unused appointments do not roll over into the next calendar year.";

    return responseBuilder.speak(speechOutput).getResponse();
  },
};

const StartedKBPayJunkPickupIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "KBPayJunkPickUpIntent"
    );
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput;

    const speechOutput =
      "If you have used your free junk pickups, you may schedule a paid bulky waste pickup. Bulky waste pickups are scheduled only on a property's regular service day. The fee for a paid pickup is $36.41. \
      To schedule a bulky waste pickup, please contact the Sacramento City Utility Billing Office at 9 1 6 8 0 8 5 4 5 4 and select option two. Billing Office hours are: Monday through Thursday, 8 AM to 4 PM and Friday, 8 AM to 11:30 AM.";

    return responseBuilder.speak(speechOutput).getResponse();
  },
};

const StartedKBReplacementContainerIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "KBReplacementContainerIntent"
    );
  },
  handle(handlerInput) {
    const { responseBuilder } = handlerInput;

    const speechOutput =
      "The City will replace a missing container free of charge. Property owners may order additional containers for a monthly fee. \
      For pricing and additional information, please visit the City of Sacramento website at www.cityofsacramento.org or call 3-1-1.";
    return responseBuilder.speak(speechOutput).getResponse();
  },
};

  
  module.exports = {StartedKBTrashCanIntentHandler, StartedKBJunkPickUpIntentHandler, StartedKBPayJunkPickupIntentHandler, StartedKBReplacementContainerIntentHandler}
      