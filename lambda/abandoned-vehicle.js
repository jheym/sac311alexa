const Alexa = require("ask-sdk-core")

const AbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AbandonedVehicleIntent"
    )
  },
  handle(handlerInput) {
    const speakOutput =
      "Thank you. What's the make and model of the abandoned vehicle?"

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(
        "add a reprompt if you want to keep the session open for the user to respond"
      )
      .getResponse()
  },
}

module.exports = { AbandonedVehicleIntentHandler }
