const Alexa = require("ask-sdk-core")
const index = require("./index.js")

const TrashPickUpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && Alexa.getIntentName(handlerInput.requestEnvelope) === "TrashPickupIntent"
    )
  },
  handle(handlerInput) {
    if (Alexa.getDialogState(handlerInput.requestEnvelope) !== "COMPLETED") {
      return (
        handlerInput.responseBuilder
          .addDelegateDirective()
          .getResponse()
      )
    }

    if (Alexa.getDialogState(handlerInput.requestEnvelope) === "COMPLETED") {
      var trashType = Alexa.getSlotValue(handlerInput.requestEnvelope, 'trashType')
      speakOutput = `Thank you for reporting the ${trashType} trash. We'll dispatch someone to the incident as soon as we can.`
      
      return (
        handlerInput.responseBuilder
          .speak(speakOutput)
          .withShouldEndSession(true) // Replace this later to go back to welcome message optionally
          .getResponse()
      )
    }
  },
}

module.exports = { TrashPickUpIntentHandler }