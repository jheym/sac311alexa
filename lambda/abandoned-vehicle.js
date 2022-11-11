const Alexa = require("ask-sdk-core")
const index = require("./index.js")

const ConfirmAbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && Alexa.getIntentName(handlerInput.requestEnvelope) === "ConfirmAbandonedVehicleIntent"
    )
  },
  handle(handlerInput) {
    // Storing the current intent in the session handler https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/guide/Dialog-Management-Guide.pdf?aliId=29905953
    let currentIntent = handlerInput.requestEnvelope.request.intent
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes()
    sessionAttributes['ConfirmAbandonedVehicleIntent'] = currentIntent
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes)

    const speakOutput = "Just to confirm, are you reporting an abandoned vehicle?"
    index.setQuestion(handlerInput, null)
    index.setQuestion(handlerInput, 'IsAbandonedVehicleCorrect')
    return (
      handlerInput.responseBuilder
        .addDelegateDirective()
        .speak(speakOutput)
        .getResponse()
    )
  },
}

const AbandonedVehicleIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
      && Alexa.getIntentName(handlerInput.requestEnvelope) === "AbandonedVehicleIntent"
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
      var make = Alexa.getSlotValue(handlerInput.requestEnvelope, 'make')
      var model = Alexa.getSlotValue(handlerInput.requestEnvelope, 'model')
      speakOutput = `Thank you for reporting the abandoned ${make} ${model}. We'll dispatch someone to the incident as soon as we can.`
      return (
        handlerInput.responseBuilder
          .speak(speakOutput)
          .withShouldEndSession(true) // Replace this later to go back to welcome message optionally
          .getResponse()
      )
    }
  },
}


module.exports = {
  ConfirmAbandonedVehicleIntentHandler,
  AbandonedVehicleIntentHandler,
}
