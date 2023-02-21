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
      speakOutput = handlerInput.t('TRASH_THANKS',{trashType: `${trashType}`})
      
      return (
        handlerInput.responseBuilder
          .speak(speakOutput)
          .withShouldEndSession(false)
          .getResponse()
      )
    }
  },
}

module.exports = { TrashPickUpIntentHandler }